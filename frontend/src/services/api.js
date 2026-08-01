import { analyzePasswordLocally } from '../utils/analyzer';
import { checkBloomFilter } from '../utils/bloomFilter';

/**
 * 100% Client-Side API Service Layer
 * Eliminates all network calls to backend (/api/analyze, /api/breach-check, /api/generate).
 * Executes strength analysis and breach checking entirely in browser memory.
 */

export async function analyzePassword(password) {
  return analyzePasswordLocally(password);
}

export async function checkBreach(password) {
  const isMatch = checkBloomFilter(password);
  return {
    isBreached: isMatch,
    count: isMatch ? 1 : 0
  };
}
