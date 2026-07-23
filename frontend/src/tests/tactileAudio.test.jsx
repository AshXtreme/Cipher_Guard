import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { playTactileSound, resetAudioContext } from '../utils/tactileAudio';

describe('Tactile Audio Engine (Web Audio API Policy & Fallbacks)', () => {
  let mockResume;
  let mockStart;
  let mockStop;

  beforeEach(() => {
    resetAudioContext();
    mockResume = vi.fn().mockResolvedValue(undefined);
    mockStart = vi.fn();
    mockStop = vi.fn();

    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      start: mockStart,
      stop: mockStop
    };

    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn()
    };

    const MockAudioContext = vi.fn().mockImplementation(() => ({
      state: 'suspended',
      currentTime: 0,
      resume: mockResume,
      createOscillator: () => mockOscillator,
      createGain: () => mockGain,
      destination: {}
    }));

    vi.stubGlobal('AudioContext', MockAudioContext);
  });

  afterEach(() => {
    resetAudioContext();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('resumes AudioContext strictly on user interaction if context is suspended', () => {
    playTactileSound('click');
    expect(mockResume).toHaveBeenCalledTimes(1);
  });

  it('triggers zero-dependency oscillator audio feedback for click, generate, and copy', () => {
    playTactileSound('click');
    expect(mockStart).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();

    playTactileSound('generate');
    expect(mockStart).toHaveBeenCalledTimes(2);

    playTactileSound('copy');
    expect(mockStart).toHaveBeenCalledTimes(3);
  });

  it('catches audio errors gracefully without throwing unhandled exceptions', () => {
    resetAudioContext();
    vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => {
      throw new Error('Web Audio API disabled');
    }));

    expect(() => playTactileSound('click')).not.toThrow();
  });
});
