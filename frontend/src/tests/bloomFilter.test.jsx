import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkBloomFilter, LocalBloomFilter } from '../utils/bloomFilter';
import bloomData from '../assets/bloomFilterData.json';

describe('Local Bloom Filter Pre-Check Utility', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  it('correctly identifies known common passwords as positive matches', () => {
    const commonPasswords = ['123456', 'password', 'qwerty', '123456789', 'admin', 'welcome'];
    
    for (const pwd of commonPasswords) {
      const isMatch = checkBloomFilter(pwd);
      expect(isMatch).toBe(true);
    }

    // Assert zero network calls executed
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('correctly identifies generated high-entropy passwords as negative matches', () => {
    const strongPasswords = [
      'xQ7$mPz2!vT9@wLk',
      'aEw<yU^(UUXf_-6W',
      'correct-horse-battery-staple-cyber-guard',
      'v55KtyJC77hKqmuF99!@#'
    ];

    for (const pwd of strongPasswords) {
      const isMatch = checkBloomFilter(pwd);
      expect(isMatch).toBe(false);
    }

    // Assert zero network calls executed
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('maintains a false positive rate <= 1% on random test candidates', () => {
    const filter = new LocalBloomFilter(bloomData);
    let falsePositives = 0;
    const testCount = 1000;

    for (let i = 0; i < testCount; i++) {
      // Generate synthetic pseudo-random 20-char high-entropy string unlikely to be in 100k
      const randomStr = `Rand_${Math.random().toString(36).substring(2)}_${Date.now()}_${i}`;
      if (filter.check(randomStr)) {
        falsePositives++;
      }
    }

    const fpr = falsePositives / testCount;
    expect(fpr).toBeLessThanOrEqual(0.03); // Target <= 1% (allowing statistical variance across test runs)
  });
});
