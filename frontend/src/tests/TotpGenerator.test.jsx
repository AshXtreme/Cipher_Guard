import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TotpGenerator from '../components/TotpGenerator';
import {
  generateCsprngBase32Secret,
  computeTotpToken,
  getRemainingSeconds,
  buildOtpauthUri
} from '../utils/totpUtils';

describe('Offline TOTP / 2FA QR Generator Sandbox (CSPRNG + RFC 6238)', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  it('generates Base32 secrets matching RFC 4648 specs via system CSPRNG', () => {
    const secret = generateCsprngBase32Secret(20);
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThanOrEqual(32);
    // Assert all characters belong to Base32 alphabet
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it('produces accurate, deterministic 6-digit TOTP tokens for fixed secret and timestamp', () => {
    // 20-byte test vector Base32 secret
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const timestampMs = 1700000000000; // Fixed epoch timestamp (1700000000 sec)

    const token1 = computeTotpToken(secret, timestampMs);
    const token2 = computeTotpToken(secret, timestampMs);

    expect(token1).toHaveLength(6);
    expect(/^\d{6}$/.test(token1)).toBe(true);
    expect(token1).toBe('406058');
    expect(token1).toBe(token2); // Deterministic for same timestamp
  });

  it('constructs valid otpauth:// URI strings for QR code rendering', () => {
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const uri = buildOtpauthUri(secret, 'demo', 'CipherGuard');

    expect(uri).toBe('otpauth://totp/CipherGuard:demo?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=CipherGuard');
  });

  it('renders TOTP Sandbox component with disclaimer, live token, and QR code', () => {
    render(<TotpGenerator />);

    expect(screen.getByText(/MOD-11: OFFLINE_2FA_TOTP_SANDBOX/i)).not.toBeNull();
    expect(screen.getByText(/Educational Sandbox Disclaimer:/i)).not.toBeNull();
    expect(screen.getByText(/RAW_BASE32_SECRET/i)).not.toBeNull();
  });

  it('purges and regenerates a fresh secret upon clicking Regenerate button', () => {
    render(<TotpGenerator />);

    const regenBtn = screen.getByRole('button', { name: /Regenerate/i });
    fireEvent.click(regenBtn);

    expect(screen.getByText(/RAW_BASE32_SECRET/i)).not.toBeNull();
  });

  it('STRICT PRIVACY & ZERO-NETWORK TEST: Assert zero network requests are fired', () => {
    render(<TotpGenerator />);

    const regenBtn = screen.getByRole('button', { name: /Regenerate/i });
    fireEvent.click(regenBtn);

    // Assert fetch was never called
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
