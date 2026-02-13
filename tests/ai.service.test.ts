/// <reference types="jest" />
import { categorizeError, buildCognitiveProfile } from '../src/services/ai.service';

describe('AI service', () => {
  it('categorizeError returns an object with errorType', async () => {
    const res = await categorizeError({ userId: '000000000000000000000000', timeTaken: 120 });
    expect(res).toHaveProperty('errorType');
  });

  it('buildCognitiveProfile returns profile object', async () => {
    const p = await buildCognitiveProfile('000000000000000000000000');
    expect(p).toHaveProperty('weaknessAreas');
  });
});
