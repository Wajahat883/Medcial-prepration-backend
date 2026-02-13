import { StudentPerformanceDetail } from '../models/StudentPerformanceDetail';

const FEEDBACK_TEMPLATES: Record<string, string> = {
  premature_closure: "Examiner note: You closed your differential too early without excluding life-threatening causes.",
  red_flag_ignored: "Examiner note: Important red flags were not addressed; prioritise ruling these out first.",
  over_investigation: "Examiner note: The management plan proposes excessive investigations not indicated in initial presentation.",
  time_pressure: "Examiner note: Time management affected decision-making; practice timed drills.",
};

export async function generateExaminerFeedback(userId: string, questionId?: string, recentLimit = 200) {
  const recent = await StudentPerformanceDetail.find({ userId }).sort({ attemptedAt: -1 }).limit(recentLimit).lean();

  // Heuristic rules
  const errors = recent.reduce((acc: Record<string, number>, r: any) => {
    acc[r.errorType || 'none'] = (acc[r.errorType || 'none'] || 0) + 1;
    return acc;
  }, {});

  const feedback: string[] = [];
  if ((errors['clinical_reasoning'] || 0) > 5) feedback.push(FEEDBACK_TEMPLATES['premature_closure']);
  if ((errors['misinterpretation'] || 0) > 5) feedback.push(FEEDBACK_TEMPLATES['red_flag_ignored']);
  if ((errors['time_pressure'] || 0) > 3) feedback.push(FEEDBACK_TEMPLATES['time_pressure']);

  if (!feedback.length) feedback.push('Good attempt — focus on discriminators between close diagnoses.');

  return { userId, questionId: questionId || null, feedback: feedback.join(' '), generatedAt: new Date() };
}
