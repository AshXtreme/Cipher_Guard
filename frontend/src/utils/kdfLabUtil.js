import md5 from 'js-md5';

/**
 * Computes hashes & KDFs for educational demonstration.
 * Can be run directly on main thread or inside Web Worker.
 */
export async function computeEducationalHashes(text, pbkdf2Iterations = 600000, bcryptRounds = 8) {
  if (!text) return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const results = {};

  // 1. MD5
  const t0_md5 = performance.now();
  results.md5 = {
    hash: md5(text),
    timeMs: Math.round((performance.now() - t0_md5) * 100) / 100,
    label: 'Legacy — Insecure for Passwords',
    type: 'legacy'
  };

  // 2. SHA-1
  const t0_sha1 = performance.now();
  const sha1Buffer = await crypto.subtle.digest('SHA-1', data);
  const sha1Hex = Array.from(new Uint8Array(sha1Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  results.sha1 = {
    hash: sha1Hex,
    timeMs: Math.round((performance.now() - t0_sha1) * 100) / 100,
    label: 'Legacy — Insecure for Passwords',
    type: 'legacy'
  };

  // 3. SHA-256
  const t0_sha256 = performance.now();
  const sha256Buffer = await crypto.subtle.digest('SHA-256', data);
  const sha256Hex = Array.from(new Uint8Array(sha256Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  results.sha256 = {
    hash: sha256Hex,
    timeMs: Math.round((performance.now() - t0_sha256) * 100) / 100,
    label: 'Fast Hash — Not Suitable Alone for Passwords',
    type: 'fast'
  };

  // 4. SHA-512
  const t0_sha512 = performance.now();
  const sha512Buffer = await crypto.subtle.digest('SHA-512', data);
  const sha512Hex = Array.from(new Uint8Array(sha512Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  results.sha512 = {
    hash: sha512Hex,
    timeMs: Math.round((performance.now() - t0_sha512) * 100) / 100,
    label: 'Fast Hash — Not Suitable Alone for Passwords',
    type: 'fast'
  };

  // 5. PBKDF2
  const t0_pbkdf2 = performance.now();
  const keyMaterial = await crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveBits']);
  const salt = encoder.encode('CipherGuardSalt2026');
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: pbkdf2Iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  const pbkdf2Hex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  results.pbkdf2 = {
    hash: pbkdf2Hex,
    timeMs: Math.round((performance.now() - t0_pbkdf2) * 100) / 100,
    label: 'Key Derivation Function (OWASP Suitable)',
    type: 'kdf',
    iterations: pbkdf2Iterations
  };

  return results;
}
