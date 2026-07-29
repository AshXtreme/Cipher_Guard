import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import AuditDashboard from '../components/AuditDashboard';
import { auditPasswordBatch } from '../utils/auditEngine';

describe('Interactive Password Audit Dashboard (Pure Client-Side)', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  it('correctly audits batch passwords and computes summary metrics', () => {
    const rawBatch = `
      Banking: xQ7$mPz2!vT9@wLk
      Email: 123456
      Social: 123456
      Work: CorrectHorseBatteryStaple
    `;

    const result = auditPasswordBatch(rawBatch);

    expect(result.totalCount).toBe(4);
    expect(result.duplicateCount).toBe(1); // 1 extra copy of '123456'
    expect(result.duplicatedPasswords).toContain('123456');
    expect(result.weakestEntry.password).toBe('123456');
    expect(result.distribution.WEAK).toBeGreaterThanOrEqual(2);
  });

  it('accurately identifies minimum-scoring entry as weak link', () => {
    const rawBatch = `
      Strong: aEw<yU^(UUXf_-6W
      VeryWeak: admin
      Moderate: P@ssword123
    `;

    const result = auditPasswordBatch(rawBatch);
    expect(result.weakestEntry.label).toBe('VeryWeak');
    expect(result.weakestEntry.score).toBeLessThanOrEqual(25);
  });

  it('renders AuditDashboard component with privacy disclosure and handles text input', () => {
    render(<AuditDashboard />);

    expect(screen.getByText(/MOD-12: INTERACTIVE_PASSWORD_AUDIT_DASHBOARD/i)).not.toBeNull();
    expect(screen.getByText(/In-Browser Batch Privacy Guarantee:/i)).not.toBeNull();

    const textarea = screen.getByPlaceholderText(/Email: MyP@ssw0rd!2026/i);
    fireEvent.change(textarea, {
      target: { value: 'Email: password123\nBanking: xQ7$mPz2!vT9@wLk' }
    });

    const runBtn = screen.getByRole('button', { name: /Run Batch Audit/i });
    fireEvent.click(runBtn);

    expect(screen.getByText(/TOTAL_ANALYZED/i)).not.toBeNull();
  });

  it('purges memory upon clicking Clear Audit button', () => {
    render(<AuditDashboard />);

    const textarea = screen.getByPlaceholderText(/Email: MyP@ssw0rd!2026/i);
    fireEvent.change(textarea, { target: { value: 'Email: password123' } });

    const runBtn = screen.getByRole('button', { name: /Run Batch Audit/i });
    fireEvent.click(runBtn);

    const clearBtn = screen.getByRole('button', { name: /Clear Audit/i });
    fireEvent.click(clearBtn);

    expect(screen.queryByText(/TOTAL_ANALYZED/i)).toBeNull();
  });

  it('STRICT PRIVACY & ZERO-NETWORK TEST: Assert zero network requests are fired', () => {
    render(<AuditDashboard />);

    const textarea = screen.getByPlaceholderText(/Email: MyP@ssw0rd!2026/i);
    fireEvent.change(textarea, { target: { value: 'Test: xQ7$mPz2!vT9@wLk' } });

    const runBtn = screen.getByRole('button', { name: /Run Batch Audit/i });
    fireEvent.click(runBtn);

    // Assert fetch was never called
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
