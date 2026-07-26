import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeEducationalHashes } from '../utils/kdfLabUtil';
import md5 from 'js-md5';

describe('Client-Side Hashing & KDF Lab Utility', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  it('matches known test vectors for MD5, SHA-1, and SHA-256', async () => {
    const input = 'abc';
    const res = await computeEducationalHashes(input, 1000);

    // Known test vectors for 'abc'
    expect(res.md5.hash).toBe('900150983cd24fb0d6963f7d28e17f72');
    expect(res.sha1.hash).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(res.sha256.hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

    // Assert zero network calls executed
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calculates PBKDF2 with custom iteration counts', async () => {
    const res = await computeEducationalHashes('TestInput123', 5000);
    expect(res.pbkdf2.hash).toBeDefined();
    expect(res.pbkdf2.hash.length).toBe(64); // 256 bits = 64 hex chars
    expect(res.pbkdf2.iterations).toBe(5000);
  });

  it('handles empty input gracefully without throwing errors', async () => {
    const res = await computeEducationalHashes('');
    expect(res).toBeNull();
  });

  it('asserts 100% offline client-side computation with zero network requests', async () => {
    await computeEducationalHashes('SamplePasswordToHash', 1000);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
