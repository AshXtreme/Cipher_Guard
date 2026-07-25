import { describe, it, expect } from 'vitest';
import { estimateCrackTimes, formatDuration } from '../utils/crackTimeEstimator';

describe('Time-to-Crack Estimator Utility', () => {
  it('handles low entropy inputs (e.g. 10 bits) correctly', () => {
    const res = estimateCrackTimes(10);
    expect(res.onlineThrottled).toContain('5 seconds');
    expect(res.offlineFast).toContain('Instant');
  });

  it('handles medium entropy inputs (e.g. 45 bits) correctly', () => {
    const res = estimateCrackTimes(45);
    expect(res.onlineThrottled).toMatch(/(years|centuries)/);
    expect(res.offlineFast).toMatch(/(seconds|minutes|hours)/);
  });

  it('handles high entropy inputs (e.g. 90 bits) correctly', () => {
    const res = estimateCrackTimes(90);
    expect(res.onlineThrottled).toContain('centuries');
    expect(res.offlineSlow).toContain('centuries');
  });

  it('handles extremely high entropy (>= 128 bits) with capped uncrackable label', () => {
    const res = estimateCrackTimes(128);
    expect(res.onlineThrottled).toBe('Trillions of centuries (effectively uncrackable)');
    expect(res.offlineFast).toBe('Trillions of centuries (effectively uncrackable)');
  });

  it('handles edge cases gracefully (0, negative, NaN, null)', () => {
    expect(estimateCrackTimes(0).onlineThrottled).toBe('Instant (< 1 second)');
    expect(estimateCrackTimes(-10).onlineThrottled).toBe('Instant (< 1 second)');
    expect(estimateCrackTimes(NaN).onlineThrottled).toBe('Instant (< 1 second)');
    expect(estimateCrackTimes(null).onlineThrottled).toBe('Instant (< 1 second)');
  });

  it('formats duration units appropriately', () => {
    expect(formatDuration(0)).toBe('Instant (< 1 second)');
    expect(formatDuration(1)).toBe('1 second');
    expect(formatDuration(120)).toBe('2 minutes');
    expect(formatDuration(7200)).toBe('2 hours');
    expect(formatDuration(172800)).toBe('2 days');
    expect(formatDuration(31536000)).toBe('1 year');
    expect(formatDuration(31536000 * 100)).toBe('1 century');
  });
});
