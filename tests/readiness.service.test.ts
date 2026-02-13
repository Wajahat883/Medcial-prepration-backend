/// <reference types="jest" />
import { computeReadiness } from '../src/services/readiness.service';

describe('computeReadiness', () => {
  it('returns structure with overall_score and components', async () => {
    // This test assumes a test DB is configured; it will primarily validate return shape.
    const res = await computeReadiness('000000000000000000000000');
    expect(res).toHaveProperty('overall_score');
    expect(res).toHaveProperty('components');
  });
});
