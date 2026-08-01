import { describe, it, expect } from 'vitest';
import { analyzePasswordLocally } from '../utils/analyzer';

describe('100% Client-Side Password Analyzer Engine', () => {
  it('correctly analyzes a strong candidate password', () => {
    const res = analyzePasswordLocally('xQ7$mPz2!vT9@wLk');
    expect(res.score).toBeGreaterThanOrEqual(70);
    expect(res.checks.length_ok).toBe(true);
    expect(res.checks.has_lower).toBe(true);
    expect(res.checks.has_upper).toBe(true);
    expect(res.checks.has_digit).toBe(true);
    expect(res.checks.has_symbol).toBe(true);
    expect(res.checks.is_common_password).toBe(false);
  });

  it('correctly identifies weak and common passwords', () => {
    const res = analyzePasswordLocally('123456');
    expect(res.score).toBeLessThanOrEqual(20);
    expect(res.label).toBe('Very Weak');
    expect(res.checks.is_common_password).toBe(true);
    expect(res.suggestions.length).toBeGreaterThan(0);
  });

  it('returns default structured metrics for empty inputs', () => {
    const res = analyzePasswordLocally('');
    expect(res.score).toBe(0);
    expect(res.label).toBe('Awaiting Input');
    expect(res.entropyBits).toBe(0);
  });
});
