/**
 * Formats a duration in seconds into a human-readable string.
 */
export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds <= 0) {
    return 'Instant (< 1 second)';
  }

  if (seconds < 1) {
    return 'Instant (< 1 second)';
  }

  const minute = 60;
  const hour = 3600;
  const day = 86400;
  const year = 31536000;
  const century = year * 100;

  if (seconds < minute) {
    const s = Math.round(seconds);
    return `${s} ${s === 1 ? 'second' : 'seconds'}`;
  }

  if (seconds < hour) {
    const m = Math.round(seconds / minute);
    return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  }

  if (seconds < day) {
    const h = Math.round(seconds / hour);
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }

  if (seconds < year) {
    const d = Math.round(seconds / day);
    return `${d} ${d === 1 ? 'day' : 'days'}`;
  }

  if (seconds < century) {
    const y = Math.round(seconds / year);
    return `${y} ${y === 1 ? 'year' : 'years'}`;
  }

  const c = seconds / century;
  if (c < 1000) {
    const roundedC = Math.round(c);
    return `${roundedC.toLocaleString()} ${roundedC === 1 ? 'century' : 'centuries'}`;
  }

  if (c < 1000000) {
    return `${Math.round(c / 1000).toLocaleString()} thousand centuries`;
  }

  if (c < 1000000000) {
    return `${Math.round(c / 1000000).toLocaleString()} million centuries`;
  }

  return 'Trillions of centuries (effectively uncrackable)';
}

/**
 * Calculates estimated crack times across 4 attack scenarios based on entropy bits H.
 * Average search space size S = 2^H, average attempts = 2^(H-1).
 */
export function estimateCrackTimes(entropyBits) {
  const h = typeof entropyBits === 'number' && !isNaN(entropyBits) ? Math.max(0, entropyBits) : 0;

  if (h >= 128) {
    return {
      onlineThrottled: 'Trillions of centuries (effectively uncrackable)',
      onlineUnthrottled: 'Trillions of centuries (effectively uncrackable)',
      offlineSlow: 'Trillions of centuries (effectively uncrackable)',
      offlineFast: 'Trillions of centuries (effectively uncrackable)'
    };
  }

  // Average guesses required is 2^(H-1)
  const averageGuesses = Math.pow(2, Math.max(0, h - 1));

  // Benchmark Rates (guesses/sec)
  const RATES = {
    onlineThrottled: 100,               // 100 guesses/sec (rate-limited login)
    onlineUnthrottled: 10000,           // 10,000 guesses/sec (unthrottled API)
    offlineSlow: 10000,                 // 10,000 hashes/sec (bcrypt / Argon2)
    offlineFast: 100000000000           // 100,000,000,000 hashes/sec (SHA-1/MD5 multi-GPU)
  };

  return {
    onlineThrottled: formatDuration(averageGuesses / RATES.onlineThrottled),
    onlineUnthrottled: formatDuration(averageGuesses / RATES.onlineUnthrottled),
    offlineSlow: formatDuration(averageGuesses / RATES.offlineSlow),
    offlineFast: formatDuration(averageGuesses / RATES.offlineFast)
  };
}
