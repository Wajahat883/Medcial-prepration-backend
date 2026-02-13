import { PerformanceAnalyticsService } from '../services/performance-analytics.service';

/**
 * Comprehensive readiness score calculation
 */
export async function calculateReadinessScore(userId: string): Promise<{
  overall: number;
  components: {
    accuracy: number;
    time: number;
    stability: number;
    coverage: number;
    consistency: number;
  };
  interpretation: string;
  recommendation: string;
  daysUntilReady?: number;
}> {
  const metrics = await PerformanceAnalyticsService.getPerformanceMetrics(userId);
  const trends = await PerformanceAnalyticsService.getPerformanceTrends(userId, 30);
  const difficultyWeighted = await PerformanceAnalyticsService.getDifficultyWeightedMetrics(userId);

  // Component 1: Accuracy (0-40 points)
  const accuracyScore = Math.min(40, (metrics.accuracy / 100) * 40);

  // Component 2: Time efficiency (0-20 points, penalize if too slow or too fast)
  let timeScore = 20;
  const avgTimeSeconds = metrics.avgTimePerQuestion / 1000;
  if (avgTimeSeconds > 180) {
    // Over 3 minutes per question
    timeScore = Math.max(5, 20 - (avgTimeSeconds - 180) / 10);
  } else if (avgTimeSeconds < 20) {
    // Under 20 seconds - likely rushing
    timeScore = Math.max(5, 20 - (20 - avgTimeSeconds) / 2);
  }

  // Component 3: Stability (0-20 points) - variance in performance
  let stability = 20;
  if (trends.length >= 3) {
    const accuracies = trends.slice(-3).map((t) => t.accuracy);
    const mean = accuracies.reduce((a, b) => a + b) / accuracies.length;
    const variance = accuracies.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / accuracies.length;
    const stdDev = Math.sqrt(variance);
    stability = Math.max(5, 20 - stdDev / 5);
  }

  // Component 4: Coverage (0-10 points) - how many categories covered
  const categories = Object.keys(metrics.attemptsByCategory);
  const coverageScore = Math.min(10, (categories.length / 10) * 10); // Assume 10 categories

  // Component 5: Consistency (0-10 points) - trending accuracy
  let consistencyScore = 10;
  if (trends.length >= 5) {
    const recentTrend = trends.slice(-5).map((t) => t.accuracy);
    const slope = calculateTrendSlope(recentTrend);
    if (slope < -2) {
      // Declining significantly
      consistencyScore = 5;
    } else if (slope > 2) {
      // Improving significantly
      consistencyScore = 10;
    } else if (slope < 0) {
      // Slight decline
      consistencyScore = 8;
    }
  }

  const overall = Math.round(
    accuracyScore + timeScore + stability + coverageScore + consistencyScore
  );

  // Interpretation
  let interpretation = '';
  let recommendation = '';
  let daysUntilReady = undefined;

  if (overall < 40) {
    interpretation = 'Not Ready – Focus Required';
    recommendation =
      'Your exam readiness is low. Focus on building foundational knowledge. Increase daily practice to 100+ questions. Target weak categories first.';
  } else if (overall < 70) {
    interpretation = 'Borderline – Delay Exam';
    const improvementNeeded = 70 - overall;
    daysUntilReady = Math.ceil(improvementNeeded * 3); // Rough estimate
    recommendation = `You're borderline. Delay your exam by approximately ${daysUntilReady} days. Focus on high-yield topics and improve weak categories to ${Math.round(metrics.accuracy + 10)}% accuracy.`;
  } else {
    interpretation = 'Exam Ready – Book AMC MCQ';
    recommendation =
      'You are well-prepared! You can confidently schedule your exam. Continue targeted revision of weak areas and maintain your study momentum.';
  }

  return {
    overall,
    components: {
      accuracy: Math.round(accuracyScore * 100) / 100,
      time: Math.round(timeScore * 100) / 100,
      stability: Math.round(stability * 100) / 100,
      coverage: Math.round(coverageScore * 100) / 100,
      consistency: Math.round(consistencyScore * 100) / 100,
    },
    interpretation,
    recommendation,
    daysUntilReady,
  };
}

/**
 * Categorize error type based on question metadata and user behavior
 */
export function categorizeError(
  question: any,
  selectedAnswer: number,
  correctAnswer: number,
  timeTaken: number,
  userConfidenceLevel?: number
): {
  category: 'knowledgeGap' | 'reasoningError' | 'dataInterpretation' | 'timePressure';
  confidence: number;
  evidence: string[];
} {
  const evidence: string[] = [];
  let scores = {
    knowledgeGap: 0,
    reasoningError: 0,
    dataInterpretation: 0,
    timePressure: 0,
  };

  // Time pressure analysis
  if (timeTaken < 15000) {
    // Under 15 seconds
    scores.timePressure += 0.3;
    evidence.push('Answered very quickly');
  }
  if (timeTaken > 120000 && timeTaken < 150000) {
    // Between 2-2.5 minutes
    scores.timePressure += 0.2;
    evidence.push('Decision-making took longer than typical');
  }

  // Question type analysis
  if (question.tags?.includes('next-step') || question.tags?.includes('management')) {
    scores.reasoningError += 0.3;
    evidence.push('Clinical reasoning question');
  }

  if (question.tags?.includes('priority') || question.tags?.includes('urgent')) {
    scores.reasoningError += 0.25;
    evidence.push('Prioritization question');
  }

  if (question.tags?.includes('elderly') || question.tags?.includes('pediatric')) {
    scores.dataInterpretation += 0.2;
    evidence.push('Age-specific context question');
  }

  if (
    question.tags?.includes('lab') ||
    question.tags?.includes('vital') ||
    question.tags?.includes('imaging')
  ) {
    scores.dataInterpretation += 0.35;
    evidence.push('Data interpretation question');
  }

  // Difficulty-based scoring
  if (question.difficulty === 'hard') {
    scores.reasoningError += 0.2;
    evidence.push('High difficulty question');
  } else if (question.difficulty === 'easy' && !evidence.includes('Answered very quickly')) {
    scores.knowledgeGap += 0.3;
    evidence.push('Easy question answered incorrectly');
  } else if (question.difficulty === 'easy') {
    scores.knowledgeGap += 0.4;
    evidence.push('Easy question answered too quickly');
  }

  // Confidence analysis
  if (userConfidenceLevel !== undefined) {
    if (userConfidenceLevel > 0.8) {
      scores.knowledgeGap += 0.1; // Confident but wrong = knowledge issue
      evidence.push('Overconfident answer');
    }
  }

  // Default to knowledge gap if no other strong signal
  if (Object.values(scores).every((s) => s === 0)) {
    scores.knowledgeGap = 0.5;
    evidence.push('Knowledge gap default');
  }

  // Find category with highest score
  let maxScore = 0;
  let maxCategory: keyof typeof scores = 'knowledgeGap';
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category as keyof typeof scores;
    }
  }

  return {
    category: maxCategory,
    confidence: Math.min(1, maxScore * 1.5), // Normalize to 0-1
    evidence,
  };
}

/**
 * Calculate trend slope for regression analysis
 */
function calculateTrendSlope(values: number[]): number {
  if (values.length < 2) return 0;

  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b) / n;

  const numerator = x.reduce(
    (sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean),
    0
  );
  const denominator = x.reduce((sum, xi) => sum + (xi - xMean) ** 2, 0);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate IRT difficulty weight for accuracy adjustment
 */
export function calculateIRTWeightedAccuracy(accuracy: number, avgDifficulty: number): number {
  // IRT Model: adjust accuracy based on average difficulty
  // Difficulty range: 0 (very easy) to 1 (very hard)
  // Weight easy questions less, hard questions more

  const easyWeight = 0.8;
  const mediumWeight = 1.0;
  const hardWeight = 1.5;

  let weight = mediumWeight;
  if (avgDifficulty < 0.33) {
    weight = easyWeight;
  } else if (avgDifficulty > 0.66) {
    weight = hardWeight;
  }

  return Math.min(100, (accuracy * weight * 100) / 100);
}

/**
 * Get mock exam stability score
 */
export function calculateMockStability(testScores: number[]): number {
  if (testScores.length < 2) return 50;

  const mean = testScores.reduce((a, b) => a + b) / testScores.length;
  const variance =
    testScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / testScores.length;
  const stdDev = Math.sqrt(variance);

  // Convert std dev to stability score (0-100)
  // Lower variance = higher stability
  return Math.max(0, Math.min(100, 100 - stdDev));
}

/**
 * Get topic coverage percentage
 */
export function calculateTopicCoverage(
  categoriesAttempted: string[],
  totalCategories: string[],
  weightByImportance?: Record<string, number>
): number {
  if (totalCategories.length === 0) return 0;

  let coveredWeight = 0;
  let totalWeight = 0;

  totalCategories.forEach((cat) => {
    const weight = weightByImportance?.[cat] || 1;
    totalWeight += weight;
    if (categoriesAttempted.includes(cat)) {
      coveredWeight += weight;
    }
  });

  return (coveredWeight / totalWeight) * 100;
}

/**
 * Generate readiness report with multiple formats
 */
export async function generateReadinessReport(userId: string) {
  const readiness = await calculateReadinessScore(userId);
  const metrics = await PerformanceAnalyticsService.getPerformanceMetrics(userId);
  const profile = await PerformanceAnalyticsService.getCognitiveProfile(userId);

  return {
    readiness,
    metrics,
    profile,
    summary: {
      status: readiness.interpretation,
      recommendation: readiness.recommendation,
      nextSteps: getNextSteps(readiness.overall, metrics),
    },
  };
}

/**
 * Generate next steps based on readiness score
 */
function getNextSteps(
  readinessScore: number,
  metrics: any
): string[] {
  const steps: string[] = [];

  if (readinessScore < 40) {
    steps.push('Focus on foundational knowledge - build accuracy to 60%+');
    steps.push('Do 50-100 questions daily, grouped by category');
    steps.push('Review weak categories thoroughly after each session');
    steps.push('Target: Reach 60% accuracy in next 2 weeks');
  } else if (readinessScore < 70) {
    steps.push('Consolidate knowledge in weak areas');
    steps.push('Practice 80-100 questions daily, mixed difficulty');
    steps.push('Take 2-3 mock exams to build confidence');
    steps.push('Target: Reach 70%+ accuracy in next 3 weeks');
  } else {
    steps.push('Maintain momentum with 60-80 questions daily');
    steps.push('Focus on problem areas identified in mocks');
    steps.push('Practice time management under exam conditions');
    steps.push('Take final mock exam 1 week before real exam');
  }

  // Performance-specific recommendations
  if (metrics.accuracy < 50) {
    steps.push('Consider extending exam date by 2-3 months');
  }

  if (
    metrics.avgTimePerQuestion > 120000 &&
    readinessScore > 60
  ) {
    steps.push('Work on speed - aim for 90-120 seconds per question');
  }

  return steps;
}
