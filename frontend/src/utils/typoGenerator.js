import { checkBloomFilter } from './bloomFilter';

const QWERTY_ADJACENCY = {
  'q': ['w', 'a', '1', '2'],
  'w': ['q', 'e', 'a', 's', '2', '3'],
  'e': ['w', 'r', 's', 'd', '3', '4'],
  'r': ['e', 't', 'd', 'f', '4', '5'],
  't': ['r', 'y', 'f', 'g', '5', '6'],
  'y': ['t', 'u', 'g', 'h', '6', '7'],
  'u': ['y', 'i', 'h', 'j', '7', '8'],
  'i': ['u', 'o', 'j', 'k', '8', '9'],
  'o': ['i', 'p', 'k', 'l', '9', '0'],
  'p': ['o', 'l', '0', '-', '['],
  'a': ['q', 'w', 's', 'z'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'f': ['d', 'r', 't', 'g', 'v', 'c'],
  'g': ['f', 't', 'y', 'h', 'b', 'v'],
  'h': ['g', 'y', 'u', 'j', 'n', 'b'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p', ';'],
  'z': ['a', 's', 'x'],
  'x': ['z', 's', 'd', 'c'],
  'c': ['x', 'd', 'f', 'v'],
  'v': ['c', 'f', 'g', 'b'],
  'b': ['v', 'g', 'h', 'n'],
  'n': ['b', 'h', 'j', 'm'],
  'm': ['n', 'j', 'k']
};

const SHIFT_MAP = {
  '1': '!', '!': '1',
  '2': '@', '@': '2',
  '3': '#', '#': '3',
  '4': '$', '$': '4',
  '5': '%', '%': '5',
  '6': '^', '^': '6',
  '7': '&', '&': '7',
  '8': '*', '*': '8',
  '9': '(', '(': '9',
  '0': ')', ')': '0',
  '-': '_', '_': '-',
  '=': '+', '+': '='
};

/**
 * Generates single-edit distance QWERTY mutations for a password candidate.
 * Returns array of objects: [{ type: string, variant: string }]
 */
export function generateTypoMutations(passwordInput) {
  if (!passwordInput || typeof passwordInput !== 'string') return [];
  const password = passwordInput.slice(0, 256);

  const mutations = [];
  const seen = new Set([password]);

  const addVariant = (type, variant) => {
    if (variant && !seen.has(variant)) {
      seen.add(variant);
      mutations.push({ type, variant });
    }
  };

  const len = password.length;

  // 1. Transposition (swapping adjacent pairs)
  for (let i = 0; i < len - 1; i++) {
    const chars = password.split('');
    const temp = chars[i];
    chars[i] = chars[i + 1];
    chars[i + 1] = temp;
    addVariant('Transposition', chars.join(''));
  }

  // 2. Shift-key slip (toggling case & shifted symbols)
  for (let i = 0; i < len; i++) {
    const char = password[i];

    // Case toggle
    if (char >= 'a' && char <= 'z') {
      const variant = password.slice(0, i) + char.toUpperCase() + password.slice(i + 1);
      addVariant('Shift-key slip', variant);
    } else if (char >= 'A' && char <= 'Z') {
      const variant = password.slice(0, i) + char.toLowerCase() + password.slice(i + 1);
      addVariant('Shift-key slip', variant);
    }

    // Shift symbol slip
    if (SHIFT_MAP[char]) {
      const variant = password.slice(0, i) + SHIFT_MAP[char] + password.slice(i + 1);
      addVariant('Shift-key slip', variant);
    }
  }

  // 3. Adjacent-key substitution (QWERTY neighbor)
  for (let i = 0; i < len; i++) {
    const char = password[i].toLowerCase();
    const adj = QWERTY_ADJACENCY[char];
    if (adj) {
      for (const neighbor of adj) {
        const replacement = password[i] === password[i].toUpperCase() && char >= 'a' && char <= 'z'
          ? neighbor.toUpperCase()
          : neighbor;
        const variant = password.slice(0, i) + replacement + password.slice(i + 1);
        addVariant('Adjacent-key substitution', variant);
      }
    }
  }

  // 4. Single character drop or duplicate
  for (let i = 0; i < len; i++) {
    // Drop character i
    const dropped = password.slice(0, i) + password.slice(i + 1);
    addVariant('Character drop', dropped);

    // Duplicate character i
    const duplicated = password.slice(0, i) + password[i] + password[i] + password.slice(i + 1);
    addVariant('Character duplicate', duplicated);
  }

  return mutations;
}

/**
 * Checks candidate password mutations against v1.3 Bloom Filter.
 * Returns first matching typo hit if found, or null if clean.
 */
export function checkTypoStressTest(password) {
  if (!password || password.length < 3) return null;

  const mutations = generateTypoMutations(password);
  for (const item of mutations) {
    if (checkBloomFilter(item.variant)) {
      return {
        matchedVariant: item.variant,
        mutationType: item.type,
        candidatePassword: password
      };
    }
  }

  return null;
}
