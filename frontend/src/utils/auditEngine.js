/**
 * Pure Client-Side Password Batch Audit Utility Engine
 * Analyzes batches 100% in-browser with zero network calls and zero persistence.
 */

const COMMON_WEAK_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345', 'qwerty',
  '111111', '1234567', 'dragon', 'welcome', 'admin', 'master',
  'iloveyou', 'sunshine', 'princess', 'charlie', 'monkey', 'letmein'
]);

/**
 * Computes strength score, bit entropy, and tier for a single candidate string.
 */
export function analyzeSinglePassword(pwd, label = '') {
  const password = pwd.trim();
  if (!password) return null;

  let hasLower = /[a-z]/.test(password);
  let hasUpper = /[A-Z]/.test(password);
  let hasDigit = /[0-9]/.test(password);
  let hasSymbol = /[^a-zA-Z0-9]/.test(password);

  let poolSize = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSymbol ? 32 : 0);
  if (poolSize === 0) poolSize = 26;

  const entropyBits = Math.round(password.length * Math.log2(poolSize) * 100) / 100;

  // Base score calculation
  let score = Math.min(100, Math.round(entropyBits * 1.1));

  // Length bonuses
  if (password.length >= 16) score += 15;
  else if (password.length >= 12) score += 10;

  // Penalties
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    score = Math.min(score, 10);
  }
  if (password.length < 8) {
    score = Math.min(score, 25);
  }

  score = Math.max(0, Math.min(100, score));

  // Tier classification
  let tier = 'WEAK';
  if (score >= 80) tier = 'EXCELLENT';
  else if (score >= 60) tier = 'STRONG';
  else if (score >= 40) tier = 'MODERATE';

  return {
    label: label || 'Unlabeled',
    password,
    length: password.length,
    entropyBits,
    score,
    tier
  };
}

/**
 * Runs a full batch audit on an array or raw multiline text of candidate passwords.
 */
export function auditPasswordBatch(rawInput) {
  let lines = [];
  if (Array.isArray(rawInput)) {
    lines = rawInput;
  } else if (typeof rawInput === 'string') {
    lines = rawInput.split(/\r?\n/);
  }

  const entries = [];
  const seenMap = new Map(); // pwd -> count
  const duplicatesList = new Set();

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if line contains a label format e.g. "Banking: myPass123!"
    let label = `Entry #${idx + 1}`;
    let pwd = trimmed;
    if (trimmed.includes(':') && !trimmed.startsWith('http')) {
      const parts = trimmed.split(':');
      label = parts[0].trim();
      pwd = parts.slice(1).join(':').trim();
    }

    const analyzed = analyzeSinglePassword(pwd, label);
    if (analyzed) {
      entries.push(analyzed);

      // Track exact duplicates
      const count = (seenMap.get(analyzed.password) || 0) + 1;
      seenMap.set(analyzed.password, count);
      if (count > 1) {
        duplicatesList.add(analyzed.password);
      }
    }
  });

  if (entries.length === 0) {
    return {
      totalCount: 0,
      avgScore: 0,
      avgEntropy: 0,
      duplicateCount: 0,
      duplicatedPasswords: [],
      weakestEntry: null,
      distribution: { WEAK: 0, MODERATE: 0, STRONG: 0, EXCELLENT: 0 },
      entries: []
    };
  }

  // Find duplicates & weakest link
  let weakestEntry = entries[0];
  let totalScore = 0;
  let totalEntropy = 0;
  const distribution = { WEAK: 0, MODERATE: 0, STRONG: 0, EXCELLENT: 0 };

  entries.forEach((entry) => {
    totalScore += entry.score;
    totalEntropy += entry.entropyBits;
    distribution[entry.tier] = (distribution[entry.tier] || 0) + 1;

    if (entry.score < weakestEntry.score) {
      weakestEntry = entry;
    }
  });

  const duplicateCount = Array.from(seenMap.values()).filter(c => c > 1).reduce((acc, c) => acc + (c - 1), 0);

  return {
    totalCount: entries.length,
    avgScore: Math.round(totalScore / entries.length),
    avgEntropy: Math.round((totalEntropy / entries.length) * 100) / 100,
    duplicateCount,
    duplicatedPasswords: Array.from(duplicatesList),
    weakestEntry,
    distribution,
    entries
  };
}
