import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import ComparisonTray from '../components/ComparisonTray';

describe('ComparisonTray Component', () => {
  beforeEach(() => {
    // Mock global fetch for /api/analyze and /api/breach-check
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/analyze')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            score: 85,
            label: 'VERY STRONG',
            checks: {
              length: true,
              has_lower: true,
              has_upper: true,
              has_digit: true,
              has_symbol: true,
              is_common: false,
              is_sequential: false
            },
            suggestions: []
          })
        });
      }
      if (url.includes('/api/breach-check')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            prefix: 'A88A5',
            suffixes: [],
            status: 'CLEAN'
          })
        });
      }
      return Promise.reject(new Error('Unknown API route'));
    });

    // Mock crypto.subtle.digest
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new Uint8Array(20).buffer)
        }
      },
      writable: true,
      configurable: true
    });

    // Spy on localStorage and sessionStorage
    vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'getItem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders empty state initially and shows privacy banner when candidate is added', async () => {
    render(<ComparisonTray currentAnalyzerPassword="TestConsolePassword123!" />);

    expect(screen.getByText(/No candidates in comparison tray/i)).toBeDefined();

    const input = screen.getByPlaceholderText(/Enter candidate password to compare/i);
    const addButton = screen.getByRole('button', { name: /Add Candidate/i });

    fireEvent.change(input, { target: { value: 'CandidatePass1!' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/In-Memory Privacy Guarantee:/i)).toBeDefined();
      expect(screen.getByText(/CANDIDATE #1/i)).toBeDefined();
    });

    // Verify localStorage and sessionStorage were NEVER accessed
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('limits candidate addition to maximum of 3 candidates', async () => {
    render(<ComparisonTray currentAnalyzerPassword="" />);

    const input = screen.getByPlaceholderText(/Enter candidate password to compare/i);
    const addButton = screen.getByRole('button', { name: /Add Candidate/i });

    // Add Candidate 1
    fireEvent.change(input, { target: { value: 'PassOne123!' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(screen.getByText(/CANDIDATE #1/i)).toBeDefined());

    // Add Candidate 2
    fireEvent.change(input, { target: { value: 'PassTwo123!' } });
    fireEvent.click(addButton);

    await waitFor(() => expect(screen.getByText(/CANDIDATE #2/i)).toBeDefined());

    // Add Candidate 3
    fireEvent.change(input, { target: { value: 'PassThree123!' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/CANDIDATE #3/i)).toBeDefined();
      expect(screen.getByText(/CANDIDATES: 3\/3/i)).toBeDefined();
    });

    // Input form should hide when 3 candidates exist
    expect(screen.queryByPlaceholderText(/Enter candidate password to compare/i)).toBeNull();
  });

  it('resets all candidate state when Clear All button is clicked', async () => {
    render(<ComparisonTray currentAnalyzerPassword="ConsolePass123!" />);

    const fromConsoleBtn = screen.getByRole('button', { name: /\+ From Console/i });
    fireEvent.click(fromConsoleBtn);

    await waitFor(() => expect(screen.getByText(/CANDIDATE #1/i)).toBeDefined());

    const clearAllBtn = screen.getByRole('button', { name: /Clear All/i });
    fireEvent.click(clearAllBtn);

    expect(screen.queryByText(/CANDIDATE #1/i)).toBeNull();
    expect(screen.getByText(/No candidates in comparison tray/i)).toBeDefined();

    // Verify zero storage interaction
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});
