import { checkBloomFilter } from './bloomFilter';

const COMMON_WEAK_PASSWORDS = new Set([
  '123456', 'password', '123456789', '12345678', '12345', 'qwerty',
  '111111', '1234567', 'dragon', 'welcome', 'admin', 'master',
  'iloveyou', 'sunshine', 'princess', 'charlie', 'monkey', 'letmein'
]);

function checkSequential(str) {
  if (!str || str.length < 3) return false;
  const lower = str.toLowerCase();
  
  // Repeated characters (e.g. "aaa", "111")
  for (let i = 0; i < lower.length - 2; i++) {
    if (lower[i] === lower[i + 1] && lower[i] === lower[i + 2]) {
      return true;
    }
  }

  // Sequential char codes (e.g. "abc", "123")
  for (let i = 0; i < lower.length - 2; i++) {
    const code1 = lower.charCodeAt(i);
    const code2 = lower.charCodeAt(i + 1);
    const code3 = lower.charCodeAt(i + 2);
    if (code2 === code1 + 1 && code3 === code1 + 2) {
      return true;
    }
  }

  // Keyboard row patterns
  const keyboardPatterns = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  for (const pattern of keyboardPatterns) {
    for (let i = 0; i <= pattern.length - 3; i++) {
      const sub = pattern.substring(i, i + 3);
      if (lower.includes(sub)) return true;
    }
  }

  return false;
}

/**
 * Evaluates password strength 100% in browser memory with zero network calls.
 */
export function analyzePasswordLocally(passwordInput) {
  if (!passwordInput) {
    return {
      score: 0,
      label: 'Awaiting Input',
      entropyBits: 0,
      checks: {
        length_ok: false,
        has_lower: false,
        has_upper: false,
        has_digit: false,
        has_symbol: false,
        is_common_password: false,
        has_sequential_chars: false
      },
      suggestions: ['Type a password to analyze strength in real-time.']
    };
  }

  const password = passwordInput.slice(0, 256);

  const has_lower = /[a-z]/.test(password);
  const has_upper = /[A-Z]/.test(password);
  const has_digit = /[0-9]/.test(password);
  const has_symbol = /[^a-zA-Z0-9]/.test(password);
  const length_ok = password.length >= 12;

  const is_common_password = checkBloomFilter(password) || COMMON_WEAK_PASSWORDS.has(password.toLowerCase());
  const has_sequential_chars = checkSequential(password);

  let poolSize = (has_lower ? 26 : 0) + (has_upper ? 26 : 0) + (has_digit ? 10 : 0) + (has_symbol ? 32 : 0);
  if (poolSize === 0) poolSize = 26;

  const entropyBits = Math.round(password.length * Math.log2(poolSize) * 100) / 100;

  // Base score based on entropy
  let score = Math.min(100, Math.round(entropyBits * 1.1));

  // Modifiers
  if (password.length >= 16) score += 15;
  else if (password.length >= 12) score += 10;

  if (has_sequential_chars) score -= 15;
  if (is_common_password) score = Math.min(score, 10);
  if (password.length < 8) score = Math.min(score, 20);

  score = Math.max(0, Math.min(100, score));

  // Label assignment
  let label = 'Very Weak';
  if (score >= 85) label = 'Very Strong';
  else if (score >= 70) label = 'Strong';
  else if (score >= 50) label = 'Fair';
  else if (score >= 30) label = 'Weak';

  // Suggestions
  const suggestions = [];
  if (!length_ok) {
    suggestions.push('Increase length to at least 12 characters (16+ recommended for high entropy).');
  }
  if (!has_upper) {
    suggestions.push('Add uppercase letters (A-Z) to widen the character search space.');
  }
  if (!has_lower) {
    suggestions.push('Include lowercase letters (a-z).');
  }
  if (!has_digit) {
    suggestions.push('Mix in numeric digits (0-9).');
  }
  if (!has_symbol) {
    suggestions.push('Add special symbols (!@#$%^&*) to resist dictionary attacks.');
  }
  if (is_common_password) {
    suggestions.push('CRITICAL: This password appears in common breach lists. Change it immediately.');
  }
  if (has_sequential_chars) {
    suggestions.push('Avoid sequential runs (e.g. 123, abc) or repeated character series.');
  }

  return {
    score,
    label,
    entropyBits,
    checks: {
      length_ok,
      has_lower,
      has_upper,
      has_digit,
      has_symbol,
      is_common_password,
      has_sequential_chars
    },
    suggestions
  };
}
