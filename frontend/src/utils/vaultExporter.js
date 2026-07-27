// Web Crypto API helper functions for AES-GCM-256 + PBKDF2 Vault Export

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

function base64ToBuffer(base64) {
  const binary = typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM-256 key from a master passphrase and salt using PBKDF2-HMAC-SHA256.
 */
async function deriveAesKey(masterPassphrase, saltBytes, iterations = 600000) {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(masterPassphrase);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts an array of credentials into a secure AES-GCM-256 JSON vault structure.
 */
export async function exportEncryptedVault(credentialsArray, masterPassphrase, iterations = 600000) {
  if (!masterPassphrase) {
    throw new Error("Master export passphrase is required.");
  }
  if (!credentialsArray || !Array.isArray(credentialsArray) || credentialsArray.length === 0) {
    throw new Error("At least one candidate credential must be selected for export.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const aesKey = await deriveAesKey(masterPassphrase, salt, iterations);

  const payloadString = JSON.stringify({
    exportedAt: new Date().toISOString(),
    generator: "CipherGuard v1.5",
    credentials: credentialsArray
  });

  const encoder = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    aesKey,
    encoder.encode(payloadString)
  );

  const vaultPackage = {
    version: "1.5",
    algorithm: "AES-GCM-256",
    kdf: "PBKDF2-HMAC-SHA256",
    iterations: iterations,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBuffer)
  };

  return vaultPackage;
}

/**
 * Decrypts a CipherGuard AES-GCM-256 .cgvault payload string using the master passphrase.
 */
export async function decryptEncryptedVault(vaultPackage, masterPassphrase) {
  if (!vaultPackage || !masterPassphrase) {
    throw new Error("Vault package and master passphrase are required.");
  }

  const saltBytes = new Uint8Array(base64ToBuffer(vaultPackage.salt));
  const ivBytes = new Uint8Array(base64ToBuffer(vaultPackage.iv));
  const ciphertextBuffer = base64ToBuffer(vaultPackage.ciphertext);

  const aesKey = await deriveAesKey(masterPassphrase, saltBytes, vaultPackage.iterations || 600000);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    aesKey,
    ciphertextBuffer
  );

  const decoder = new TextDecoder();
  const decryptedString = decoder.decode(decryptedBuffer);
  return JSON.parse(decryptedString);
}

/**
 * Triggers a client-side Blob file download for the encrypted vault JSON package.
 */
export function triggerVaultDownload(vaultPackage, filename = 'cipherguard-vault.cgvault') {
  const blob = new Blob([JSON.stringify(vaultPackage, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
