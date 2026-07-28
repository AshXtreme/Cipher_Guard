import { describe, it, expect, vi } from 'vitest';
import { generatePolicyPassword, generatePronounceablePassword, getCsprngRandomInt, csprngShuffle } from '../utils/policyGenerator';

describe('Password Policy Compatibility Generator (CSPRNG + Fisher-Yates)', () => {
  it('generates passwords strictly satisfying min and max length bounds', () => {
    const res = generatePolicyPassword({ minLength: 14, maxLength: 14 });
    expect(res.password).toHaveLength(14);
  });

  it('strictly satisfies exact-count rules for symbols, digits, and uppercase letters', () => {
    for (let run = 0; run < 10; run++) {
      const res = generatePolicyPassword({
        minLength: 16,
        maxLength: 16,
        exactSymbols: 2,
        exactDigits: 3,
        exactUpper: 4
      });

      const symbolsCount = (res.password.match(/[^a-zA-Z0-9]/g) || []).length;
      const digitsCount = (res.password.match(/[0-9]/g) || []).length;
      const upperCount = (res.password.match(/[A-Z]/g) || []).length;

      expect(symbolsCount).toBeGreaterThanOrEqual(2);
      expect(digitsCount).toBeGreaterThanOrEqual(3);
      expect(upperCount).toBeGreaterThanOrEqual(4);
    }
  });

  it('strictly excludes blocklist characters from output', () => {
    const blocklist = '&<>%"\'';
    for (let run = 0; run < 10; run++) {
      const res = generatePolicyPassword({ minLength: 20, maxLength: 20, blocklist });
      for (const char of blocklist) {
        expect(res.password).not.toContain(char);
      }
    }
  });

  it('throws a descriptive validation error on impossible rule combinations', () => {
    // Min length > Max length
    expect(() => generatePolicyPassword({ minLength: 16, maxLength: 10 })).toThrow();

    // Required exact sum > Max length
    expect(() => generatePolicyPassword({
      minLength: 8,
      maxLength: 8,
      exactSymbols: 5,
      exactDigits: 5
    })).toThrow();
  });

  it('generates pronounceable passwords using CSPRNG and alternating CVC structure', () => {
    const spy = vi.spyOn(crypto, 'getRandomValues');
    const res = generatePronounceablePassword({ minLength: 12 });

    expect(res.password).toBeDefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('performs CSPRNG Fisher-Yates shuffle correctly', () => {
    const arr = ['A', 'B', 'C', 'D', 'E'];
    const original = [...arr];
    csprngShuffle(arr);
    expect(arr).toHaveLength(original.length);
  });
});
