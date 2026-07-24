import React, { useState, useCallback, useEffect } from 'react';
import { Sliders, Dices, Copy, Check, Shield, BookOpen, Key, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { useClipboardTimer } from '../hooks/useClipboardTimer';

const isDicewareEnabled = import.meta.env.VITE_FEATURE_DICEWARE === 'true';
const isCopyBufferEnabled = import.meta.env.VITE_FEATURE_COPY_BUFFER === 'true';

export default function TactileGenerator({ onGenerateToAnalyzer }) {
  const [genMode, setGenMode] = useState('random'); // 'random' | 'diceware'
  const [length, setLength] = useState(16);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);

  // Diceware State
  const [wordCount, setWordCount] = useState(6);
  const [separator, setSeparator] = useState('-');

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [entropyBits, setEntropyBits] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-expiring copy buffer hook
  const { copied, timeLeft, copyToClipboard, cancelAutoClear } = useClipboardTimer();

  const fetchGeneratedPassword = useCallback(async () => {
    setIsGenerating(true);
    try {
      let query;
      if (genMode === 'diceware' && isDicewareEnabled) {
        query = new URLSearchParams({
          mode: 'diceware',
          word_count: wordCount.toString(),
          separator: separator
        });
      } else {
        query = new URLSearchParams({
          mode: 'random',
          length: length.toString(),
          symbols: includeSymbols.toString(),
          numbers: includeNumbers.toString(),
          exclude_ambiguous: excludeAmbiguous.toString()
        });
      }

      const res = await fetch(`/api/generate?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGeneratedPassword(data.password);
        setEntropyBits(data.entropy_bits);
      }
    } catch (err) {
      console.error("Failed to generate password:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [genMode, length, includeSymbols, includeNumbers, excludeAmbiguous, wordCount, separator]);

  // Initial and reactive fetch on control change
  useEffect(() => {
    fetchGeneratedPassword();
  }, [fetchGeneratedPassword]);

  const handleCopy = () => {
    if (!generatedPassword) return;
    if (isCopyBufferEnabled) {
      copyToClipboard(generatedPassword, 30);
    } else {
      navigator.clipboard.writeText(generatedPassword);
    }
  };

  const handleApplyToAnalyzer = () => {
    if (generatedPassword && onGenerateToAnalyzer) {
      onGenerateToAnalyzer(generatedPassword);
    }
  };

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#849581]">
          <Dices className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-03: TACTILE_GENERATOR_RACK</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1b22] text-[#00ff66] border border-[#00ff66]/30">
          SECRETS_CSPRNG
        </span>
      </div>

      {/* Mode Selector Toggle (Feature-flagged) */}
      {isDicewareEnabled && (
        <div className="grid grid-cols-2 gap-2 bg-[#050505] p-1.5 rounded-lg border border-[#2d382c] font-mono text-xs">
          <button
            type="button"
            onClick={() => setGenMode('random')}
            className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all ${
              genMode === 'random'
                ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 font-bold shadow-sm'
                : 'text-[#849581] hover:text-[#e3e1ec]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Random Characters</span>
          </button>
          <button
            type="button"
            onClick={() => setGenMode('diceware')}
            className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-all ${
              genMode === 'diceware'
                ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 font-bold shadow-sm'
                : 'text-[#849581] hover:text-[#e3e1ec]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Passphrase (Diceware)</span>
          </button>
        </div>
      )}

      {/* Output Display */}
      <div className="bg-[#050505] border border-[#2d382c] p-4 rounded-lg flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-[#849581]">
          <span>GENERATED_OUTPUT ({genMode.toUpperCase()})</span>
          <span className="text-[#00ff66] font-bold">
            ENTROPY: {entropyBits} BITS
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 font-mono text-base md:text-lg text-[#00ff66] text-glow tracking-wider overflow-x-auto whitespace-nowrap py-1">
            {generatedPassword || "GENERATING..."}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2.5 rounded-lg bg-[#1a1b22] hover:bg-[#252630] border border-[#2d382c] hover:border-[#00ff66] text-[#00ff66] transition-all"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={fetchGeneratedPassword}
              disabled={isGenerating}
              className="p-2.5 rounded-lg bg-[#00ff66]/20 hover:bg-[#00ff66]/30 border border-[#00ff66]/40 text-[#00ff66] transition-all"
              title="Generate new password"
            >
              <Dices className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Auto-Expiring Buffer Active Countdown Badge & Honest Disclaimer */}
        {isCopyBufferEnabled && copied && timeLeft > 0 && (
          <div className="mt-2 pt-2 border-t border-[#1a241b] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#00ff66]">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Copied! Auto-clearing clipboard in <strong className="text-yellow-400">{timeLeft}s</strong></span>
            </div>
            <button
              onClick={cancelAutoClear}
              className="text-[10px] text-[#849581] hover:text-red-400 flex items-center gap-1 transition-colors"
              title="Cancel auto-clear countdown"
            >
              <XCircle className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Honest Limitation Disclaimer */}
      {isCopyBufferEnabled && (
        <div className="flex items-start gap-2 p-2.5 rounded bg-[#050505] border border-[#2d382c] text-[11px] font-mono text-[#849581]">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
          <span>
            We'll try to clear your clipboard after 30s. This isn't guaranteed on every browser/OS — don't rely on it as your only protection on a shared device.
          </span>
        </div>
      )}

      {/* Controls: Random Characters Mode */}
      {genMode === 'random' && (
        <div className="space-y-4 font-mono text-xs text-[#e3e1ec]">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[#849581]">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#00ff66]" />
                PASSWORD_LENGTH
              </span>
              <span className="text-[#00ff66] font-bold text-sm">{length} CHARS</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#050505] rounded border border-[#2d382c] accent-[#00ff66] cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded bg-[#050505] border border-[#2d382c] hover:border-[#00ff66]/50">
              <input
                type="checkbox"
                checked={includeSymbols}
                onChange={(e) => setIncludeSymbols(e.target.checked)}
                className="accent-[#00ff66] rounded cursor-pointer"
              />
              <span className="text-[11px]">Symbols (!@#)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded bg-[#050505] border border-[#2d382c] hover:border-[#00ff66]/50">
              <input
                type="checkbox"
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
                className="accent-[#00ff66] rounded cursor-pointer"
              />
              <span className="text-[11px]">Numbers (0-9)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded bg-[#050505] border border-[#2d382c] hover:border-[#00ff66]/50">
              <input
                type="checkbox"
                checked={excludeAmbiguous}
                onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                className="accent-[#00ff66] rounded cursor-pointer"
              />
              <span className="text-[11px]">No Ambiguous</span>
            </label>
          </div>
        </div>
      )}

      {/* Controls: Diceware Passphrase Mode */}
      {genMode === 'diceware' && isDicewareEnabled && (
        <div className="space-y-4 font-mono text-xs text-[#e3e1ec]">
          {/* Word Count Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[#849581]">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#00ff66]" />
                WORD_COUNT (EFF Large List)
              </span>
              <span className="text-[#00ff66] font-bold text-sm">{wordCount} WORDS</span>
            </div>
            <input
              type="range"
              min={3}
              max={12}
              value={wordCount}
              onChange={(e) => setWordCount(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#050505] rounded border border-[#2d382c] accent-[#00ff66] cursor-pointer"
            />
          </div>

          {/* Separator Chooser */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-[#849581]">WORD_SEPARATOR</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Hyphen (-)', val: '-' },
                { label: 'Underscore (_)', val: '_' },
                { label: 'Dot (.)', val: '.' },
                { label: 'Space ( )', val: ' ' }
              ].map((sep) => (
                <button
                  key={sep.val}
                  type="button"
                  onClick={() => setSeparator(sep.val)}
                  className={`py-2 text-[11px] rounded border transition-all ${
                    separator === sep.val
                      ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#00ff66] font-bold'
                      : 'bg-[#050505] border-[#2d382c] text-[#849581] hover:text-[#e3e1ec]'
                  }`}
                >
                  {sep.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action CTA */}
      <button
        onClick={handleApplyToAnalyzer}
        className="mt-auto w-full py-3 rounded-lg bg-[#00ff66]/15 hover:bg-[#00ff66]/25 border border-[#00ff66]/50 text-[#00ff66] font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all glow-accent"
      >
        <Shield className="w-4 h-4" />
        <span>ANALYZE THIS GENERATED OUTPUT IN CONSOLE</span>
      </button>
    </div>
  );
}
