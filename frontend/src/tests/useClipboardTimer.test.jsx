import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useClipboardTimer } from '../hooks/useClipboardTimer';

describe('useClipboardTimer Hook', () => {
  let mockWriteText;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('triggers copy action, sets copied state, and starts countdown timer', async () => {
    const { result } = renderHook(() => useClipboardTimer());

    await act(async () => {
      await result.current.copyToClipboard('SuperSecret123!', 30);
    });

    expect(mockWriteText).toHaveBeenCalledWith('SuperSecret123!');
    expect(result.current.copied).toBe(true);
    expect(result.current.timeLeft).toBe(30);

    // Fast-forward 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.timeLeft).toBe(29);
  });

  it('attempts to clear clipboard on timer expiry', async () => {
    const { result } = renderHook(() => useClipboardTimer());

    await act(async () => {
      await result.current.copyToClipboard('SuperSecret123!', 5);
    });

    expect(result.current.timeLeft).toBe(5);

    // Advance 5 seconds to trigger timer expiry
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockWriteText).toHaveBeenLastCalledWith('');
    expect(result.current.copied).toBe(false);
    expect(result.current.timeLeft).toBe(0);
  });

  it('supersedes previous timer when copying a new value', async () => {
    const { result } = renderHook(() => useClipboardTimer());

    await act(async () => {
      await result.current.copyToClipboard('FirstValue', 30);
    });

    // Fast forward 10s
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.timeLeft).toBe(20);

    // Copy second value -> should supersede first timer and reset to 30
    await act(async () => {
      await result.current.copyToClipboard('SecondValue', 30);
    });

    expect(mockWriteText).toHaveBeenLastCalledWith('SecondValue');
    expect(result.current.timeLeft).toBe(30);

    // Advance 30s
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    // Should clear clipboard ONCE for the second value
    expect(mockWriteText).toHaveBeenLastCalledWith('');
  });

  it('cancels auto-clear countdown when cancelAutoClear is invoked', async () => {
    const { result } = renderHook(() => useClipboardTimer());

    await act(async () => {
      await result.current.copyToClipboard('CancelTest', 30);
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      result.current.cancelAutoClear();
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.timeLeft).toBe(0);
  });
});
