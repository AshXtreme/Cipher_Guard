import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportEncryptedVault, decryptEncryptedVault } from '../utils/vaultExporter';

describe('Encrypted Vault Exporter Utility (AES-GCM-256 + PBKDF2)', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  it('successfully executes an encrypt-then-decrypt round trip with matching passphrase', async () => {
    const credentials = [
      { label: 'Primary Key', value: 'xQ7$mPz2!vT9@wLk', entropy: 104.8 },
      { label: 'Backup Passphrase', value: 'correct-horse-battery-staple', entropy: 92.5 }
    ];

    const masterPassphrase = 'SuperSecretMasterExportPassphrase2026!';

    // Encrypt
    const vaultPackage = await exportEncryptedVault(credentials, masterPassphrase, 1000);
    expect(vaultPackage.version).toBe('1.5');
    expect(vaultPackage.algorithm).toBe('AES-GCM-256');
    expect(vaultPackage.salt).toBeDefined();
    expect(vaultPackage.iv).toBeDefined();
    expect(vaultPackage.ciphertext).toBeDefined();

    // Decrypt
    const decrypted = await decryptEncryptedVault(vaultPackage, masterPassphrase);
    expect(decrypted.credentials).toHaveLength(2);
    expect(decrypted.credentials[0].value).toBe('xQ7$mPz2!vT9@wLk');
    expect(decrypted.credentials[1].value).toBe('correct-horse-battery-staple');

    // Assert zero network calls executed
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects decryption when given an incorrect master passphrase (AES-GCM tag failure)', async () => {
    const credentials = [{ label: 'Key', value: 'SecretValue123!' }];
    const correctPassphrase = 'CorrectMasterPassphrase!123';
    const wrongPassphrase = 'WrongMasterPassphrase!456';

    const vaultPackage = await exportEncryptedVault(credentials, correctPassphrase, 1000);

    // Decrypt with wrong passphrase must throw an error
    await expect(decryptEncryptedVault(vaultPackage, wrongPassphrase)).rejects.toThrow();
  });

  it('validates input parameters and throws errors on missing parameters', async () => {
    await expect(exportEncryptedVault([], 'MasterPass123')).rejects.toThrow();
    await expect(exportEncryptedVault([{ value: 'pwd' }], '')).rejects.toThrow();
  });

  it('asserts 100% offline client-side computation with zero network requests', async () => {
    await exportEncryptedVault([{ value: 'OfflinePass' }], 'MasterPassphrase123!', 1000);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
