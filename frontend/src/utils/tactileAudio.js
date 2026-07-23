/**
 * Zero-Dependency Web Audio API Tactile Sound Engine
 * Provides client-side oscillator sound feedback without external sound files.
 * Ensures AudioContext initializes/resumes strictly on user click interactions.
 */

let globalAudioCtx = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  return globalAudioCtx;
}

export function resetAudioContext() {
  globalAudioCtx = null;
}


export function playTactileSound(type = 'click') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Directives Rule 1: Resume context strictly on user click interaction
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'generate') {
      // Futuristic CSPRNG pitch sweep burst
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'copy') {
      // Confirmation tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.04); // A5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      // Standard tactile keypress click (short 30ms burst)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.start(now);
      osc.stop(now + 0.03);
    }
  } catch (err) {
    // Directive 3: Graceful error catching ensures audio errors never break password generation
    console.warn('Tactile audio feedback caught error:', err);
  }
}
