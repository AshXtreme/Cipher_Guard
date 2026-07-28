import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import BreachTimeline from '../components/BreachTimeline';

describe('Breach-Leak Exposure Timeline Component (Static Dataset)', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  it('renders breach timeline title, educational disclaimer, and static entries', () => {
    render(<BreachTimeline />);

    expect(screen.getByText(/MOD-10: BREACH_EXPOSURE_TIMELINE/i)).not.toBeNull();
    expect(screen.getByText(/Educational Reference Disclaimer:/i)).not.toBeNull();

    // Verify key citable breaches exist in rendered output
    expect(screen.getByText('Yahoo (3 Billion Breach)')).not.toBeNull();
    expect(screen.getByText('Adobe Systems')).not.toBeNull();
    expect(screen.getByText('LinkedIn')).not.toBeNull();
  });

  it('filters dataset entries correctly based on search query', () => {
    render(<BreachTimeline />);

    const searchInput = screen.getByPlaceholderText(/Search breach or hash algorithm.../i);
    fireEvent.change(searchInput, { target: { value: 'Canva' } });

    expect(screen.getByText('Canva')).not.toBeNull();
    expect(screen.queryByText('Adobe Systems')).toBeNull();
  });

  it('filters dataset by hash type category buttons', () => {
    render(<BreachTimeline />);

    // Click PLAINTEXT filter
    const plaintextBtn = screen.getByRole('button', { name: 'PLAINTEXT' });
    fireEvent.click(plaintextBtn);

    expect(screen.getByText('RockYou')).not.toBeNull();
    expect(screen.queryByText('LastPass Vault Leak')).toBeNull();
  });

  it('STRICT PRIVACY & ZERO-NETWORK TEST: Assert zero network requests are fired', () => {
    render(<BreachTimeline />);

    const searchInput = screen.getByPlaceholderText(/Search breach or hash algorithm.../i);
    fireEvent.change(searchInput, { target: { value: 'Dropbox' } });

    // Assert fetch was never called
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
