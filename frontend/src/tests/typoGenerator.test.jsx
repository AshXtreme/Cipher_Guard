import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateTypoMutations, checkTypoStressTest } from '../utils/typoGenerator';

describe('Typo-Squatting / Fat-Finger Stress Test Utility', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  it('generates bounded single-edit distance mutations O(L)', () => {
    const pwd = 'Password123!';
    const mutations = generateTypoMutations(pwd);
    expect(mutations.length).toBeGreaterThan(0);
    expect(mutations.length).toBeLessThan(120); // Strictly bounded

    for (const m of mutations) {
      expect(m.type).toBeDefined();
      expect(m.variant).toBeDefined();
    }
  });

  it('detects single QWERTY typos that reduce to common Bloom filter passwords', () => {
    // 'passwptd' is a single adjacent key typo of 'password' (w -> o or p -> o)
    // 'passwrod' is a single transposition of 'password'
    const result = checkTypoStressTest('passwrod');
    expect(result).not.toBeNull();
    expect(result.mutationType).toBeDefined();
    expect(result.matchedVariant).toBeDefined();

    // Assert zero network requests executed
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles short input lengths (1-2 chars) safely without throwing', () => {
    expect(generateTypoMutations('a').length).toBeGreaterThan(0);
    expect(checkTypoStressTest('a')).toBeNull();
    expect(checkTypoStressTest('')).toBeNull();
    expect(checkTypoStressTest(null)).toBeNull();
  });

  it('asserts 100% client-side zero-network execution', () => {
    checkTypoStressTest('MySuperSecretComplexPass2026!');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
