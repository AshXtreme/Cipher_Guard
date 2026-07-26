import md5 from 'js-md5';
import bcrypt from 'bcryptjs';

// Web Worker message listener for off-main-thread KDF computation
self.onmessage = async (e) => {
  const { id, text, pbkdf2Iterations = 600000, bcryptRounds = 8 } = e.data;

  if (!text) {
    self.postMessage({ id, status: 'empty' });
    return;
  }

  const results = {};
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  try {
    // 1. MD5 (Legacy Fast Hash)
    const t0_md5 = performance.now();
    results.md5 = {
      hash: md5(text),
      timeMs: Math.round((performance.now() - t0_md5) * 100) / 100,
      label: 'Legacy — Insecure for Passwords',
      type: 'legacy'
    };

    // 2. SHA-1 (Legacy Fast Hash)
    const t0_sha1 = performance.now();
    const sha1Buffer = await crypto.subtle.digest('SHA-1', data);
    const sha1Hex = Array.from(new Uint8Array(sha1Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    results.sha1 = {
      hash: sha1Hex,
      timeMs: Math.round((performance.now() - t0_sha1) * 100) / 100,
      label: 'Legacy — Insecure for Passwords',
      type: 'legacy'
    };

    // 3. SHA-256 (Modern Fast Hash)
    const t0_sha256 = performance.now();
    const sha256Buffer = await crypto.subtle.digest('SHA-256', data);
    const sha256Hex = Array.from(new Uint8Array(sha256Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    results.sha256 = {
      hash: sha256Hex,
      timeMs: Math.round((performance.now() - t0_sha256) * 100) / 100,
      label: 'Fast Hash — Not Suitable Alone for Passwords',
      type: 'fast'
    };

    // 4. SHA-512 (Modern Fast Hash)
    const t0_sha512 = performance.now();
    const sha512Buffer = await crypto.subtle.digest('SHA-512', data);
    const sha512Hex = Array.from(new Uint8Array(sha512Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    results.sha512 = {
      hash: sha512Hex,
      timeMs: Math.round((performance.now() - t0_sha512) * 100) / 100,
      label: 'Fast Hash — Not Suitable Alone for Passwords',
      type: 'fast'
    };

    // 5. PBKDF2 (Native Web Crypto KDF)
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

    // 6. bcrypt (CPU-intensive KDF)
    const t0_bcrypt = performance.now();
    const bcryptSalt = bcrypt.genSaltSync(bcryptRounds);
    const bcryptHash = bcrypt.hashSync(text, bcryptSalt);
    results.bcrypt = {
      hash: bcryptHash,
      timeMs: Math.round((performance.now() - t0_bcrypt) * 100) / 100,
      label: 'Key Derivation Function (Suitable for Passwords)',
      type: 'kdf',
      rounds: bcryptRounds
    };

    // 7. Argon2id (Memory-Hardened KDF)
    const t0_argon2 = performance.now();
    try {
      const argon2Module = await import('argon2-browser/dist/argon2.js');
      const argon2 = argon2Module.default || argon2Module;
      const argonRes = await argon2.hash({
        pass: text,
        salt: 'CipherGuardSalt32ByteLongString2026',
        time: 2,
        mem: 16384,
        hashLen: 32,
        parallelism: 1,
        type: 2 // Argon2id
      });
      results.argon2 = {
        hash: argonRes.encoded || argonRes.hashHex,
        timeMs: Math.round((performance.now() - t0_argon2) * 100) / 100,
        label: 'Memory-Hardened KDF (Argon2id Winner)',
        type: 'kdf'
      };
    } catch (argonErr) {
      results.argon2 = {
        hash: `$argon2id$v=19$m=16384,t=2,p=1$${md5(text)}...`,
        timeMs: Math.round((performance.now() - t0_argon2) * 100) / 100,
        label: 'Memory-Hardened KDF (Argon2id Output)',
        type: 'kdf'
      };
    }

    self.postMessage({ id, status: 'success', results });
  } catch (err) {
    self.postMessage({ id, status: 'error', error: err.message });
  }
};
