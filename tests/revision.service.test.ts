/// <reference types="jest" />
import { generateRevisionBucketsForUser } from '../src/services/revision.service';

describe('Revision service', () => {
  it('generates buckets (structure)', async () => {
    const res = await generateRevisionBucketsForUser('000000000000000000000000');
    expect(Array.isArray(res)).toBe(true);
  });
});
