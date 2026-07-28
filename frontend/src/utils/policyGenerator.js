// CSPRNG-backed Password Policy Compatibility & Pronounceable Generator

const LOWER_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const UPPER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT_CHARS = '0123456789';
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'z'];
const VOWELS = ['a', 'e', 'i', 'o', 'u'];

/**
 * Returns a cryptographically secure random integer in range [0, max).
 */
export function getCsprngRandomInt(max) {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/**
 * Performs an in-place Fisher-Yates shuffle powered by CSPRNG.
 */
export function csprngShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getCsprngRandomInt(i + 1);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

/**
 * Filters source characters by removing any characters present in blocklist.
 */
function filterBlocklist(source, blocklist) {
  if (!blocklist) return source;
  const blockSet = new Set(blocklist.split(''));
  return source.split('').filter(ch => !blockSet.has(ch)).join('');
}

/**
 * Generates a policy-compliant password using structured composition + Fisher-Yates CSPRNG shuffle.
 */
export function generatePolicyPassword(options = {}) {
  const {
    minLength = 12,
    maxLength = 16,
    exactSymbols = 0,
    exactDigits = 0,
    exactUpper = 0,
    allowedSymbols = SYMBOL_CHARS,
    blocklist = '',
    mode = 'policy' // 'policy' | 'pronounceable'
  } = options;

  // Validation 1: Min length <= Max length
  if (minLength > maxLength) {
    throw new Error(`Minimum length (${minLength}) cannot exceed maximum length (${maxLength}).`);
  }

  // Validation 2: Max length >= sum of required exact counts
  const requiredExactSum = exactSymbols + exactDigits + exactUpper;
  if (maxLength < requiredExactSum) {
    throw new Error(`Max length (${maxLength}) is too short for required exact counts (${requiredExactSum}).`);
  }

  // Handle Pronounceable Mode
  if (mode === 'pronounceable') {
    return generatePronounceablePassword(options);
  }

  // Filter character pools by blocklist
  const cleanLower = filterBlocklist(LOWER_CHARS, blocklist);
  const cleanUpper = filterBlocklist(UPPER_CHARS, blocklist);
  const cleanDigits = filterBlocklist(DIGIT_CHARS, blocklist);
  const cleanSymbols = filterBlocklist(allowedSymbols, blocklist);

  if (!cleanLower && !cleanUpper && !cleanDigits && !cleanSymbols) {
    throw new Error("Allowed character pool is empty after applying blocklist.");
  }

  const targetLength = Math.max(minLength, Math.min(maxLength, minLength));
  const resultChars = [];

  // 1. Add required exact-count characters
  for (let i = 0; i < exactSymbols; i++) {
    if (!cleanSymbols) throw new Error("No allowed symbols available for required exact symbol count.");
    resultChars.push(cleanSymbols[getCsprngRandomInt(cleanSymbols.length)]);
  }

  for (let i = 0; i < exactDigits; i++) {
    if (!cleanDigits) throw new Error("No allowed digits available for required exact digit count.");
    resultChars.push(cleanDigits[getCsprngRandomInt(cleanDigits.length)]);
  }

  for (let i = 0; i < exactUpper; i++) {
    if (!cleanUpper) throw new Error("No allowed uppercase letters available for required exact uppercase count.");
    resultChars.push(cleanUpper[getCsprngRandomInt(cleanUpper.length)]);
  }

  // 2. Build remaining pool and fill remaining slots
  let remainingPool = cleanLower + cleanUpper + cleanDigits + cleanSymbols;
  if (!remainingPool) remainingPool = cleanLower || 'a';

  while (resultChars.length < targetLength) {
    resultChars.push(remainingPool[getCsprngRandomInt(remainingPool.length)]);
  }

  // 3. Perform Fisher-Yates CSPRNG shuffle
  csprngShuffle(resultChars);

  const password = resultChars.join('');

  // 4. Calculate actual entropy
  const poolSize = new Set(remainingPool.split('')).size || 26;
  const entropyBits = Math.round(password.length * Math.log2(poolSize) * 100) / 100;
  const isLowEntropy = entropyBits < 40;

  return {
    password,
    entropyBits,
    isLowEntropy,
    poolSize
  };
}

/**
 * Generates a memorable pronounceable password using alternating CVC/CVCV syllable structures.
 */
export function generatePronounceablePassword(options = {}) {
  const { minLength = 12, appendDigit = true, appendSymbol = true } = options;

  let password = '';
  let poolSize = CONSONANTS.length * VOWELS.length * CONSONANTS.length;

  while (password.length < (minLength - 3)) {
    const c1 = CONSONANTS[getCsprngRandomInt(CONSONANTS.length)];
    const v = VOWELS[getCsprngRandomInt(VOWELS.length)];
    const c2 = CONSONANTS[getCsprngRandomInt(CONSONANTS.length)];
    const syllable = (password.length === 0)
      ? c1.toUpperCase() + v + c2
      : '-' + c1 + v + c2;
    password += syllable;
  }

  if (appendDigit) {
    const digit = DIGIT_CHARS[getCsprngRandomInt(DIGIT_CHARS.length)];
    password += digit;
  }
  if (appendSymbol) {
    const symbol = SYMBOL_CHARS[getCsprngRandomInt(SYMBOL_CHARS.length)];
    password += symbol;
  }

  const entropyBits = Math.round(password.length * Math.log2(26 + 10 + 32) * 100) / 100;
  const isLowEntropy = entropyBits < 40;

  return {
    password,
    entropyBits,
    isLowEntropy,
    poolSize
  };
}
