import mongoose from 'mongoose';
import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';
import { Question } from '../models/Question';
import { UserCognitiveProfile } from '../models/UserCognitiveProfile';

export type ErrorType = 'Knowledge Gap' | 'Reasoning Error' | 'Data Interpretation' | 'Time Pressure';

interface AnalyzedError {
  errorType: ErrorType;
  confidence: number;
  reasoning: string;
}

interface ClinicalPattern {
  category: string;
  type: string;
  frequency: number;
  impact: 'high' | 'medium' | 'low';
}

/**
 * AI Error Pattern & Reasoning Analysis Service
 * Categorizes errors and identifies reasoning patterns
 */
export class CognitiveErrorAnalyzer {
  /**
   * Analyze error based on question context and response data
   */
  static async analyzeError(
    userId: string,
    questionId: string,
    userAnswer: string,
    correctAnswer: string,
    timeTaken: number,
    explanation: string
  ): Promise<AnalyzedError> {
    try {
      const question = await Question.findById(questionId).lean();
      if (!question) {
        throw new Error('Question not found');
      }

      // Collect relevant performance data
      const userAttempts = await StudentPerformanceDetail.find({
        userId: new mongoose.Types.ObjectId(userId),
        questionId: new mongoose.Types.ObjectId(questionId),
      })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();

      // Error categorization logic
      const errorType = this.categorizeError(
        userAnswer,
        correctAnswer,
        timeTaken,
        question,
        explanation,
        userAttempts
      );

      // Calculate confidence in the categorization
      const confidence = this.calculateConfidence(errorType, userAnswer, timeTaken);

      return {
        errorType,
        confidence: Math.round(confidence * 100) / 100,
        reasoning: this.generateErrorReasoning(errorType, question, userAnswer, timeTaken),
      };
    } catch (error) {
      console.error('[CognitiveErrorAnalyzer] Error analyzing error:', error);
      return {
        errorType: 'Knowledge Gap',
        confidence: 0.5,
        reasoning: 'Error analysis not available',
      };
    }
  }

  /**
   * Categorize error into one of 4 types
   */
  private static categorizeError(
    userAnswer: string,
    correctAnswer: string,
    timeTaken: number,
    question: any,
    explanation: string,
    previousAttempts: any[]
  ): ErrorType {
    // Time pressure detection: answered correctly on review but not under time
    if (previousAttempts.some((a: any) => a.isCorrect) && timeTaken > 120) {
      return 'Time Pressure';
    }

    // Check if user struggled with data interpretation in clinical stem
    const hasClinicalData =
      (question.stem || '').match(/\b(bpm|mmHg|mEq|U\/L|g\/dL|°C|days|weeks|years)\b/g) || [];
    if (hasClinicalData.length > 2 && !userAnswer.includes(correctAnswer)) {
      return 'Data Interpretation';
    }

    // Reasoning error: user selected related but incorrect answer
    const isRelatedAnswer = this.areAnswersRelated(userAnswer, correctAnswer, question);
    if (isRelatedAnswer && timeTaken < 60) {
      return 'Reasoning Error';
    }

    // Default: Knowledge gap
    return 'Knowledge Gap';
  }

  /**
   * Check if user answer is related to correct answer (indicates reasoning vs knowledge)
   */
  private static areAnswersRelated(userAnswer: string, correctAnswer: string, question: any): boolean {
    // Check if answers deal with same clinical concept
    const formattedUser = userAnswer.toLowerCase();
    const formattedCorrect = correctAnswer.toLowerCase();

    // Share keywords (indicates related thinking)
    const userWords = formattedUser.split(' ');
    const correctWords = formattedCorrect.split(' ');
    const commonWords = userWords.filter((w) => correctWords.includes(w)).length;

    return commonWords >= 2;
  }

  /**
   * Calculate confidence in error categorization
   */
  private static calculateConfidence(
    errorType: ErrorType,
    userAnswer: string,
    timeTaken: number
  ): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for time pressure (very clear signal)
    if (errorType === 'Time Pressure' && timeTaken > 150) {
      confidence = 0.95;
    }

    // Decrease confidence for knowledge gap (hardest to determine)
    if (errorType === 'Knowledge Gap') {
      confidence = Math.max(0.5, confidence - 0.15);
    }

    return confidence;
  }

  /**
   * Generate human-readable reasoning for error
   */
  private static generateErrorReasoning(
    errorType: ErrorType,
    question: any,
    userAnswer: string,
    timeTaken: number
  ): string {
    switch (errorType) {
      case 'Knowledge Gap':
        return 'You may lack fundamental knowledge or definitions needed to answer this question. Review core concepts.';

      case 'Reasoning Error':
        return 'Your logic was sound but you missed a key clinical discriminator. Practice systematic differential diagnosis.';

      case 'Data Interpretation':
        return 'You may have misread clinical data (vitals, labs). Practice extracting key values from complex cases.';

      case 'Time Pressure':
        return `You answered correctly during review (${timeTaken}s taken initially). Focus on speed optimization for this topic.`;

      default:
        return 'Analysis not available for this error type.';
    }
  }

  /**
   * Analyze patterns in user errors across multiple questions
   */
  static async analyzeClinicalPatterns(
    userId: string,
    daysBack: number = 30
  ): Promise<{
    patterns: ClinicalPattern[];
    stretchAreas: string[];
    strengthAreas: string[];
    recommendations: string[];
  }> {
    try {
      const minDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      const attempts = await StudentPerformanceDetail.find({
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: minDate },
        isCorrect: false,
      })
        .populate('questionId', 'stem category')
        .lean();

      if (attempts.length === 0) {
        return {
          patterns: [],
          stretchAreas: [],
          strengthAreas: [],
          recommendations: [],
        };
      }

      // Analyze patterns by category
      const patternsByCategory: Record<string, { count: number; errors: any[] }> = {};

      attempts.forEach((attempt: any) => {
        const category = (attempt.questionId as any)?.category || 'Unknown';
        if (!patternsByCategory[category]) {
          patternsByCategory[category] = { count: 0, errors: [] };
        }
        patternsByCategory[category].count++;
        patternsByCategory[category].errors.push(attempt);
      });

      // Convert to pattern format
      const patterns: ClinicalPattern[] = Object.entries(patternsByCategory).map(([category, data]) => ({
        category,
        type: 'Weak Performance',
        frequency: data.count,
        impact: data.count >= 5 ? 'high' : data.count >= 3 ? 'medium' : 'low',
      }));

      // Get strength areas (high accuracy)
      const correctAttempts = await StudentPerformanceDetail.find({
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: minDate },
        isCorrect: true,
      })
        .populate('questionId', 'category')
        .lean();

      const correctByCategory: Record<string, number> = {};
      correctAttempts.forEach((attempt: any) => {
        const category = (attempt.questionId as any)?.category || 'Unknown';
        correctByCategory[category] = (correctByCategory[category] || 0) + 1;
      });

      const stretchAreas = patterns.filter((p) => p.impact === 'high').map((p) => p.category);
      const strengthAreas = Object.entries(correctByCategory)
        .filter(([_, count]) => count >= 5)
        .map(([category]) => category);

      // Generate recommendations
      const recommendations = this.generateRecommendations(stretchAreas, strengthAreas);

      return {
        patterns: patterns.sort((a, b) => b.frequency - a.frequency),
        stretchAreas,
        strengthAreas,
        recommendations,
      };
    } catch (error) {
      console.error('[CognitiveErrorAnalyzer] Error analyzing patterns:', error);
      return {
        patterns: [],
        stretchAreas: [],
        strengthAreas: [],
        recommendations: [],
      };
    }
  }

  /**
   * Generate recommendations based on patterns
   */
  private static generateRecommendations(stretchAreas: string[], strengthAreas: string[]): string[] {
    const recommendations: string[] = [];

    if (stretchAreas.length > 0) {
      recommendations.push(
        `Focus on ${stretchAreas[0]}: Your highest error category. Spend 40% of study time here.`
      );
    }

    if (stretchAreas.length > 1) {
      recommendations.push(
        `Secondary focus on ${stretchAreas[1]}: Your second weakest area. Allocate 30% of study time.`
      );
    }

    if (strengthAreas.length > 0) {
      recommendations.push(
        `Maintain strength in ${strengthAreas[0]}: You're doing well here. Light weekly reinforcement only.`
      );
    }

    recommendations.push('Practice mixed questions to develop rapid topic-switching ability.');
    recommendations.push('Review each missed question to understand the reasoning, not just the answer.');

    return recommendations;
  }

  /**
   * Update user cognitive profile with error patterns
   */
  static async updateCognitiveProfile(userId: string): Promise<void> {
    try {
      const analysis = await this.analyzeClinicalPatterns(userId, 30);

      await UserCognitiveProfile.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          userId: new mongoose.Types.ObjectId(userId),
          strengthCategories: analysis.strengthAreas,
          weakCategories: analysis.stretchAreas,
          errorPatterns: analysis.patterns,
          recommendations: analysis.recommendations,
          lastUpdated: new Date(),
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('[CognitiveErrorAnalyzer] Error updating profile:', error);
    }
  }
}
