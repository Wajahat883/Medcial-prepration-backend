import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';
import { Question } from '../models/Question';

// Rule-based cognitive error categorizer (Phase 3 initial implementation)
export async function categorizeError({ userId, questionId, answer, timeTaken }: { userId: string; questionId?: string; answer?: string; timeTaken?: number }) {
  // Gather recent context
  const recent = await StudentPerformanceDetail.find({ userId }).sort({ attemptedAt: -1 }).limit(200).lean();

  // Basic heuristics
  const result: any = { errorType: 'unknown', confidence: 0.5, reasons: [] };

  // If timeTaken is high -> time_pressure
  if (timeTaken && timeTaken > 90) {
    result.errorType = 'time_pressure';
    result.confidence = 0.7;
    result.reasons.push('slow_response_time');
  }

  // If same question retried multiple times and corrected -> knowledge_gap
  const sameQ = questionId ? recent.filter(r => String(r.questionId) === String(questionId)) : [];
  if (sameQ.length >= 2 && sameQ.some(s => !s.errorType || s.errorType === 'none')) {
    result.errorType = 'knowledge_gap';
    result.confidence = Math.max(result.confidence, 0.7);
    result.reasons.push('multiple_attempts_with_correction');
  }

  // If many clinical_reasoning tags in recent history -> reasoning error
  const reasoningCount = recent.filter(r => r.errorType === 'clinical_reasoning').length;
  if (reasoningCount > 8) {
    result.errorType = 'clinical_reasoning';
    result.confidence = Math.max(result.confidence, 0.75);
    result.reasons.push('repeated_clinical_reasoning_errors');
  }

  // Fallback: if recent misinterpretation dominant
  const misCount = recent.filter(r => r.errorType === 'misinterpretation').length;
  if (misCount > reasoningCount && misCount > 5) {
    result.errorType = 'misinterpretation';
    result.confidence = Math.max(result.confidence, 0.7);
    result.reasons.push('recent_data_misinterpretation');
  }

  // Add quick stat: user's avg time
  result.avgRecentTime = recent.length ? Math.round(recent.reduce((s, r) => s + (r.timeTaken || 0), 0) / recent.length) : null;

  return result;
}

export async function buildCognitiveProfile(userId: string) {
  // Lightweight profile builder using recent performance
  const recent = await StudentPerformanceDetail.find({ userId }).sort({ attemptedAt: -1 }).limit(500).lean();
  const errorCounts: Record<string, number> = {};
  for (const r of recent) {
    const et = r.errorType || 'none';
    errorCounts[et] = (errorCounts[et] || 0) + 1;
  }

  const profile = {
    userId,
    strengthAreas: [],
    weaknessAreas: Object.keys(errorCounts).filter(k => errorCounts[k] > 5),
    errorPatterns: errorCounts,
    reasoningSpeedPercentile: null,
    lastUpdatedAt: new Date(),
  } as any;

  return profile;
}
