/// <reference types="jest" />
import { trackAttempt } from '../src/controllers/analytics.controller';

// Mocks
jest.mock('../src/models/StudentPerformanceDetail', () => ({
  create: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/models/UserProgress', () => ({
  getOrCreate: jest.fn().mockResolvedValue({
    totalQuestionsAttempted: 0,
    totalCorrectAnswers: 0,
    updateCategoryProgress: jest.fn().mockResolvedValue(undefined),
    updateStreak: jest.fn().mockResolvedValue(undefined),
  }),
}));
jest.mock('../src/models/Question', () => ({
  findById: jest.fn().mockResolvedValue({ category: 'Cardiology' }),
}));
jest.mock('../src/models/QuestionMetadata', () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue(true),
}));
jest.mock('../src/models/RecallIntelligence', () => ({
  findOneAndUpdate: jest.fn().mockResolvedValue(true),
}));

describe('analytics.controller.trackAttempt', () => {
  it('returns 400 when missing required fields', async () => {
    const req: any = { user: { _id: 'user1' }, body: { timeTaken: 10 } };
    const json = jest.fn();
    const res: any = { status: jest.fn().mockReturnValue({ json }), json };
    const next = jest.fn();

    await trackAttempt(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ success: false, error: 'questionId and timeTaken are required' });
  });

  it('tracks attempt and responds success when valid payload', async () => {
    const req: any = { user: { _id: 'user1' }, body: { questionId: 'q1', timeTaken: 12, confidenceLevel: 50, isCorrect: true } };
    const json = jest.fn();
    const res: any = { json };
    const next = jest.fn();

    await trackAttempt(req, res, next);

    expect(json).toHaveBeenCalledWith({ success: true, message: 'Attempt tracked' });
  });
});
