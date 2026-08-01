import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import VaultExportModal from '../components/VaultExportModal';
import { exportEncryptedVault } from '../utils/vaultExporter';

describe('MOD-09: Vault Import & Client-Side Decryption UI', () => {
  let originalFileReader;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFileReader = global.FileReader;

    class MockFileReader {
      readAsText(file) {
        setTimeout(() => {
          const content = file._content || '';
          if (this.onload) {
            this.onload({ target: { result: content } });
          }
        }, 0);
      }
    }
    global.FileReader = MockFileReader;
  });

  afterEach(() => {
    global.FileReader = originalFileReader;
  });

  it('renders MOD-09 panel header and guidance notice banner', () => {
    render(<VaultExportModal currentPassword="TestPassword123!" />);

    expect(screen.getByText(/MOD-09: ENCRYPTED_VAULT_EXPORT_AND_IMPORT/i)).not.toBeNull();
    expect(
      screen.getByText(/Backup files are encrypted with AES-256-GCM and cannot be opened directly in standard text readers/i)
    ).not.toBeNull();
  });

  it('allows tab switching between Export and Import', () => {
    render(<VaultExportModal currentPassword="TestPassword123!" />);

    const openBtn = screen.getByRole('button', { name: /OPEN_VAULT_TOOLS/i });
    fireEvent.click(openBtn);

    const importTab = screen.getByRole('button', { name: /IMPORT & DECRYPT VAULT/i });
    fireEvent.click(importTab);

    expect(screen.getByText(/Drag & Drop your/i)).not.toBeNull();
  });

  it('processes vault import, decrypts payload with valid master password, and restores session', async () => {
    const handleRestore = vi.fn();
    render(<VaultExportModal currentPassword="OriginalPass123!" onRestorePassword={handleRestore} />);

    // Open tools
    fireEvent.click(screen.getByRole('button', { name: /OPEN_VAULT_TOOLS/i }));

    // Switch to import tab
    fireEvent.click(screen.getByRole('button', { name: /IMPORT & DECRYPT VAULT/i }));

    // Create a valid encrypted payload
    const masterPassphrase = 'MasterImportPassphrase2026!';
    const mockCredentials = [{ label: 'Restored Secret', value: 'DecryptedValue999!' }];
    const vaultPackage = await exportEncryptedVault(mockCredentials, masterPassphrase, 1000);

    const fileContent = JSON.stringify(vaultPackage);
    const file = new File([fileContent], 'backup.cgvault', { type: 'application/json' });
    file._content = fileContent;

    const fileInput = screen.getByTestId('vault-file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/ENTER MASTER PASSPHRASE FOR DECRYPTION/i)).not.toBeNull();
    });

    const passInput = screen.getByPlaceholderText(/Enter Master Password used for encryption/i);
    fireEvent.change(passInput, { target: { value: masterPassphrase } });

    const decryptBtn = screen.getByRole('button', { name: /DECRYPT & RESTORE VAULT/i });
    fireEvent.click(decryptBtn);

    await waitFor(() => {
      expect(screen.getByText(/Vault Restored Successfully!/i)).not.toBeNull();
      expect(screen.getByText(/DecryptedValue999!/i)).not.toBeNull();
    });

    expect(handleRestore).toHaveBeenCalledWith('DecryptedValue999!');
  });

  it('displays error message on invalid master passphrase', async () => {
    render(<VaultExportModal currentPassword="TestPassword123!" />);

    fireEvent.click(screen.getByRole('button', { name: /OPEN_VAULT_TOOLS/i }));
    fireEvent.click(screen.getByRole('button', { name: /IMPORT & DECRYPT VAULT/i }));

    const vaultPackage = await exportEncryptedVault([{ value: 'Secret' }], 'CorrectPassphrase123!', 1000);
    const fileContent = JSON.stringify(vaultPackage);
    const file = new File([fileContent], 'backup.cgvault', { type: 'application/json' });
    file._content = fileContent;

    const fileInput = screen.getByTestId('vault-file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/ENTER MASTER PASSPHRASE FOR DECRYPTION/i)).not.toBeNull();
    });

    const passInput = screen.getByPlaceholderText(/Enter Master Password used for encryption/i);
    fireEvent.change(passInput, { target: { value: 'WrongPassphrase456!' } });

    const decryptBtn = screen.getByRole('button', { name: /DECRYPT & RESTORE VAULT/i });
    fireEvent.click(decryptBtn);

    await waitFor(() => {
      expect(screen.getByText(/Invalid Master Password or corrupted backup file/i)).not.toBeNull();
    });
  });
});
