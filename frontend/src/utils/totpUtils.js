import { generateSync } from 'otplib';

// RFC 4648 Base32 Alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generates a Base32 TOTP secret backed by system CSPRNG (crypto.getRandomValues).
 * Default 20 bytes = 160 bits of entropy (32 Base32 characters).
 */
export function generateCsprngBase32Secret(byteLength = 20) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);

  let secret = '';
  let buffer = 0;
  let bitsLeft = 0;

  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i];
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      const index = (buffer >> (bitsLeft - 5)) & 31;
      secret += BASE32_ALPHABET[index];
      bitsLeft -= 5;
    }
  }

  if (bitsLeft > 0) {
    const index = (buffer << (5 - bitsLeft)) & 31;
    secret += BASE32_ALPHABET[index];
  }

  return secret;
}

/**
 * Computes the 6-digit TOTP code for a given secret and timestamp (ms).
 */
export function computeTotpToken(secret, timestampMs = Date.now()) {
  if (!secret || secret.length < 26) return '------';
  try {
    const epochSec = Math.floor(timestampMs / 1000);
    return generateSync({
      secret,
      epoch: epochSec,
      step: 30,
      digits: 6
    });
  } catch (err) {
    console.error("TOTP computation error:", err);
    return '------';
  }
}

/**
 * Returns remaining seconds in the current 30-second TOTP window.
 */
export function getRemainingSeconds(timestampMs = Date.now()) {
  const sec = Math.floor(timestampMs / 1000);
  return 30 - (sec % 30);
}

/**
 * Constructs an otpauth:// URI for QR code generation.
 */
export function buildOtpauthUri(secret, accountName = 'demo', issuer = 'CipherGuard') {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
