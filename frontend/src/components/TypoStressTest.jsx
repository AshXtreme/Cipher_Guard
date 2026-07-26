import React, { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Keyboard } from 'lucide-react';
import { checkTypoStressTest } from '../utils/typoGenerator';

export default function TypoStressTest({ password }) {
  const typoHit = useMemo(() => {
    return checkTypoStressTest(password);
  }, [password]);

  if (!password || password.length < 3) {
    return null;
  }

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-4 w-full font-mono">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs text-[#849581]">
          <Keyboard className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-08: TYPO_SQUATTING_FAT_FINGER_STRESS_TEST</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1b22] text-[#00ff66] border border-[#00ff66]/30">
          QWERTY_SINGLE_EDIT
        </span>
      </div>

      {/* Warning or Clean Badge */}
      {typoHit ? (
        <div className="flex flex-col gap-2 p-4 rounded-lg bg-amber-950/50 border border-amber-800 text-xs text-amber-300">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-2 text-amber-400">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Typo Vulnerability Detected!
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/80 text-amber-200 border border-amber-700 font-semibold">
              TRIGGER: {typoHit.mutationType.toUpperCase()}
            </span>
          </div>

          <p className="leading-relaxed">
            <strong>Warning:</strong> A small typo (e.g., missing a shift key or hitting an adjacent key) would turn this string into a commonly breached top-100k password.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-[#00ff66]">
          <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
          <span>
            <strong>Typo Robust:</strong> Single-edit QWERTY typos do not reduce to any top-100k common password.
          </span>
        </div>
      )}

      {/* Scope Boundary Disclaimer Note */}
      <div className="flex items-center gap-2 text-[10px] text-[#849581]">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
        <span>
          <strong>Scope Boundary:</strong> Evaluates single-edit distance QWERTY mutations (transpositions, shift slips, neighbor keys) 100% client-side via v1.3 Bloom Filter.
        </span>
      </div>
    </div>
  );
}
