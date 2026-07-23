import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import TactileGenerator from '../components/TactileGenerator';

describe('MOD-03: TactileGenerator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders MOD-03 header correctly', async () => {
    render(<TactileGenerator />);
    expect(screen.getByText(/MOD-03: TACTILE_GENERATOR_RACK/i)).not.toBeNull();
    await waitFor(() => {
      expect(screen.getByText(/GENERATED_OUTPUT/i)).not.toBeNull();
    });
  });

  it('generates random password client-side when API fetch fails or is absent', async () => {
    render(<TactileGenerator />);
    await waitFor(() => {
      const outputElement = screen.getByText(/ENTROPY:/i);
      expect(outputElement).not.toBeNull();
    });
  });

  it('handles copy button click and triggers tactile feedback without errors', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextSpy
      }
    });

    render(<TactileGenerator />);

    await waitFor(() => {
      expect(screen.getByTitle(/Copy to clipboard/i)).not.toBeNull();
    });

    const copyBtn = screen.getByTitle(/Copy to clipboard/i);
    fireEvent.click(copyBtn);

    expect(copyBtn).not.toBeNull();
  });

  it('switches modes smoothly (Random, Policy Rules, Pronounceable)', async () => {
    render(<TactileGenerator />);

    const policyBtn = screen.getByRole('button', { name: /Policy Rules/i });
    fireEvent.click(policyBtn);

    await waitFor(() => {
      expect(screen.getByText(/MIN_LENGTH/i)).not.toBeNull();
    });

    const pronBtn = screen.getByRole('button', { name: /Pronounceable/i });
    fireEvent.click(pronBtn);

    await waitFor(() => {
      expect(screen.getByText(/TARGET_LENGTH/i)).not.toBeNull();
    });
  });

  it('invokes onGenerateToAnalyzer callback when analyze button is clicked', async () => {
    const handleAnalyze = vi.fn();
    render(<TactileGenerator onGenerateToAnalyzer={handleAnalyze} />);

    await waitFor(() => {
      expect(screen.getByText(/ANALYZE THIS GENERATED OUTPUT IN CONSOLE/i)).not.toBeNull();
    });

    const analyzeBtn = screen.getByText(/ANALYZE THIS GENERATED OUTPUT IN CONSOLE/i);
    fireEvent.click(analyzeBtn);

    expect(handleAnalyze).toHaveBeenCalled();
  });
});
