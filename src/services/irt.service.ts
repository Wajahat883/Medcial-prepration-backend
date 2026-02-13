import { Question } from '../models/Question';
import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';

/**
 * Item Response Theory (IRT) Implementation for AMC MCQ
 * 
 * IRT models the relationship between:
 * - Student ability (theta): -3 to +3 scale
 * - Question difficulty (b): -3 to +3 scale
 * - Question discrimination (a): 0 to 3 scale
 * - Guessing parameter (c): 0 to 0.25 for multiple choice
 */

export interface IRTParameters {
  difficulty: number;     // b parameter: -3 (very easy) to +3 (very hard)
  discrimination: number; // a parameter: higher = better discrimination
  guessing: number;       // c parameter: probability of correct guess
}

export interface StudentAbility {
  theta: number;  // Student ability: -3 to +3
  se: number;     // Standard Error
  confidence: number; // 0-1
}

export class IRTService {
  /**
   * Calculate question parameters based on historical data
   * Using simple classical test theory approximation for IRT
   */
  static async estimateQuestionParameters(questionId: string): Promise<IRTParameters> {
    const question = await Question.findById(questionId);
    if (!question) throw new Error(`Question ${questionId} not found`);

    // Get all attempts for this question
    const attempts = await StudentPerformanceDetail.find({ questionId }).lean();

    if (attempts.length === 0) {
      // Default parameters for new questions
      const difficultyMap = { easy: -1, medium: 0, hard: 1 };
      return {
        difficulty: difficultyMap[question.difficulty] || 0,
        discrimination: 1.2,
        guessing: 0.2, // 1 out of 5 options
      };
    }

    // Difficulty (b): based on proportion correct
    const correctCount = attempts.filter((a: any) => a.isCorrect).length;
    const proportion = correctCount / attempts.length;
    
    // Map [0,1] to [-3, 3] difficulty scale
    // Higher proportion correct = lower difficulty (more negative b)
    const difficulty = -2 * Math.log(1 / proportion - 1);

    // Discrimination (a): based on point-biserial correlation
    // Simple approximation: how well does performance on this question correlate with overall performance
    let discrimination = 1.2;
    if (attempts.length >= 20) {
      const correctScores = attempts.filter((a: any) => !a.errorType || a.errorType === 'none').map((a: any) => 1);
      const wrongScores = attempts.filter((a: any) => a.errorType && a.errorType !== 'none').map((a: any) => 0);
      
      if (correctScores.length > 0 && wrongScores.length > 0) {
        // Simple discrimination estimate: variance ratio
        discrimination = Math.min(2.5, 0.8 + (correctScores.length / (wrongScores.length + 1)) * 0.5);
      }
    }

    // Guessing (c): for multiple choice, estimate from random correctness
    // Typically 1/number_of_options = 0.2 for 5 options
    const guessing = 1 / Math.max(2, question.options?.length || 5);

    return { difficulty, discrimination, guessing };
  }

  /**
   * 3PL IRT Model: P(theta) = c + (1-c) / (1 + exp(-a(theta - b)))
   * Returns probability of correct answer given student ability
   */
  static threePLModel(theta: number, params: IRTParameters): number {
    const { difficulty, discrimination, guessing } = params;
    const exponent = -discrimination * (theta - difficulty);
    const probability = guessing + (1 - guessing) / (1 + Math.exp(exponent));
    return Math.max(0, Math.min(1, probability)); // Clamp to [0, 1]
  }

  /**
   * Estimate student ability (theta) from observed responses
   * Using simple scoring: ability proportional to weighted correct answers
   */
  static async estimateStudentAbility(
    userId: string,
    questionParams: Map<string, IRTParameters>
  ): Promise<StudentAbility> {
    const attempts = await StudentPerformanceDetail.find({ userId }).lean();

    if (attempts.length === 0) {
      return { theta: 0, se: 2, confidence: 0 };
    }

    // Calculate weighted score
    let weightedScore = 0;
    let totalWeight = 0;

    for (const attempt of attempts) {
      const params = questionParams.get(attempt.questionId.toString());
      if (!params) continue;

      const weight = params.discrimination; // Weight by discrimination
      if (!attempt.errorType || attempt.errorType === 'none') {
        weightedScore += weight;
      }
      totalWeight += weight;
    }

    // Map score to ability scale [-3, 3]
    const accuracy = attempts.filter((a: any) => a.isCorrect).length / attempts.length;
    const theta = -2 * Math.log(1 / accuracy - 1); // Convert proportion to logit scale
    
    // Standard error decreases with more attempts
    const se = Math.max(0.4, 2 / Math.sqrt(attempts.length));

    // Confidence in estimate (0-1)
    const confidence = Math.min(1, attempts.length / 100);

    return { theta, se, confidence };
  }

  /**
   * Calculate expected score on exam for given student ability
   */
  static predictExamScore(
    studentTheta: number,
    examQuestions: IRTParameters[]
  ): {
    expectedScore: number;
    expectedProportionCorrect: number;
    confidence95Interval: [number, number];
  } {
    const expectedItems = examQuestions.map((params) =>
      this.threePLModel(studentTheta, params)
    );

    const expectedScore = expectedItems.reduce((sum, p) => sum + p, 0);
    const expectedProportionCorrect = expectedScore / examQuestions.length;

    // 95% CI using binomial approximation
    const sqrt = Math.sqrt(expectedProportionCorrect * (1 - expectedProportionCorrect) / examQuestions.length);
    const margin = 1.96 * sqrt;

    return {
      expectedScore: Math.round(expectedScore),
      expectedProportionCorrect: Math.round(expectedProportionCorrect * 10000) / 10000,
      confidence95Interval: [
        Math.max(0, expectedProportionCorrect - margin),
        Math.min(1, expectedProportionCorrect + margin),
      ] as [number, number],
    };
  }

  /**
   * Calculate information function: how much information question provides about student ability
   * Information = a^2 * (1-c) * (P(theta) - c) * (1 - (P(theta) - c)) / ((1 - c) * (P(theta) - c))^2
   */
  static questionInformation(theta: number, params: IRTParameters): number {
    const p = this.threePLModel(theta, params);
    const { discrimination, guessing } = params;

    if (p <= guessing || p >= 1) return 0;

    const pAdjust = (p - guessing) / (1 - guessing);
    const information =
      discrimination * discrimination * pAdjust * (1 - pAdjust);

    return Math.max(0, information);
  }

  /**
   * Identify optimal (most informative) question for student
   * Returns question that provides maximum information at student's current ability
   */
  static selectOptimalQuestion(
    theta: number,
    questionParams: IRTParameters[],
    usedQuestionIds: Set<string>
  ): IRTParameters | null {
    let bestQuestion = null;
    let maxInformation = 0;

    for (const params of questionParams) {
      const information = this.questionInformation(theta, params);
      if (information > maxInformation) {
        maxInformation = information;
        bestQuestion = params;
      }
    }

    return bestQuestion;
  }

  /**
   * Calculate Test Information Function (TIF)
   * Sum of question information functions across ability range
   */
  static testInformationFunction(
    questionParams: IRTParameters[],
    thetaRange: number[] = [-3, -2, -1, 0, 1, 2, 3]
  ): Map<number, number> {
    const tif = new Map<number, number>();

    for (const theta of thetaRange) {
      let totalInfo = 0;
      for (const params of questionParams) {
        totalInfo += this.questionInformation(theta, params);
      }
      tif.set(theta, totalInfo);
    }

    return tif;
  }

  /**
   * Get difficulty category for item
   */
  static getDifficultyCategory(difficulty: number): 'very_easy' | 'easy' | 'medium' | 'hard' | 'very_hard' {
    if (difficulty <= -1.5) return 'very_easy';
    if (difficulty <= -0.5) return 'easy';
    if (difficulty <= 0.5) return 'medium';
    if (difficulty <= 1.5) return 'hard';
    return 'very_hard';
  }

  /**
   * Calculate weighted accuracy: penalize wrong answers on hard questions less, reward correct on hard questions more
   */
  static calculateWeightedAccuracy(
    attempts: any[],
    questionParams: Map<string, IRTParameters>
  ): number {
    if (attempts.length === 0) return 0;

    let weightedScore = 0;
    let totalWeight = 0;

    for (const attempt of attempts) {
      const params = questionParams.get(attempt.questionId.toString());
      if (!params) continue;

      // Weight by difficulty: hard questions worth more points
      const weight = 1 + (params.difficulty / 3); // Range [0.67, 1.33]
      if (attempt.isCorrect) {
        weightedScore += weight;
      }
      totalWeight += weight;
    }

    return totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
  }
}
