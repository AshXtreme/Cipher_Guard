import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import EntropyHeatmap, { classifyPasswordCharacters } from '../components/EntropyHeatmap';

describe('Visual Password Entropy Heatmap Component', () => {
  it('correctly classifies symbols, letters, numbers, and weak patterns', () => {
    const { characters, counts } = classifyPasswordCharacters('A1!abc123aaa');

    expect(counts.blue).toBeGreaterThan(0); // Letters
    expect(counts.yellow).toBeGreaterThan(0); // Digits
    expect(counts.green).toBe(1); // Symbol '!'
    expect(counts.red).toBeGreaterThan(0); // Weak runs (abc, 123, aaa)
  });

  it('STRICT PRIVACY TEST: Masked state (showPassword = false) renders ONLY aggregate summary and NEVER exposes positional character elements', () => {
    const { container } = render(
      <EntropyHeatmap password="SuperSecret123!" showPassword={false} />
    );

    // Assert aggregate summary section is present
    expect(screen.getByText(/Masked Summary:/i)).not.toBeNull();
    const aggregateContainer = container.querySelector('[aria-label="Aggregate character breakdown"]');
    expect(aggregateContainer).not.toBeNull();

    // STRICT TEST: Positional container aria-label must NOT exist in the DOM
    const positionalContainer = container.querySelector('[aria-label="Positional character entropy heatmap"]');
    expect(positionalContainer).toBeNull();
  });

  it('Unmasked state (showPassword = true) renders positional character breakdown', () => {
    const { container } = render(
      <EntropyHeatmap password="P@ss1" showPassword={true} />
    );

    // Positional container MUST exist when unmasked
    const positionalContainer = container.querySelector('[aria-label="Positional character entropy heatmap"]');
    expect(positionalContainer).not.toBeNull();
  });
});
