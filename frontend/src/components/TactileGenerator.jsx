import React, { useState, useCallback, useEffect } from 'react';
import { Sliders, Dices, Copy, Check, Shield, BookOpen, Key, Clock, XCircle, AlertTriangle, Settings2, Sparkles } from 'lucide-react';
import { useClipboardTimer } from '../hooks/useClipboardTimer';
import {
  generatePolicyPassword,
  generatePronounceablePassword,
  generateRandomPassword,
  generateDicewarePassword
} from '../utils/policyGenerator';
import { playTactileSound } from '../utils/tactileAudio';

const isDicewareEnabled = import.meta.env.VITE_FEATURE_DICEWARE === 'true';
const isCopyBufferEnabled = import.meta.env.VITE_FEATURE_COPY_BUFFER === 'true';

export default function TactileGenerator({ onGenerateToAnalyzer }) {
  const [genMode, setGenMode] = useState('random'); // 'random' | 'diceware' | 'policy' | 'pronounceable'
  const [length, setLength] = useState(16);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);

  // Diceware State
  const [wordCount, setWordCount] = useState(6);
  const [separator, setSeparator] = useState('-');

  // v1.6 Policy Compatibility State
  const [minLength, setMinLength] = useState(12);
  const [maxLength, setMaxLength] = useState(16);
  const [exactSymbols, setExactSymbols] = useState(1);
  const [exactDigits, setExactDigits] = useState(2);
  const [exactUpper, setExactUpper] = useState(2);
  const [allowedSymbols, setAllowedSymbols] = useState('!@#$%^&*()_+-=[]{}');
  const [blocklist, setBlocklist] = useState('');
  const [policyError, setPolicyError] = useState(null);
  const [isLowEntropyWarning, setIsLowEntropyWarning] = useState(false);

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [entropyBits, setEntropyBits] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-expiring copy buffer hook
  const { copied, timeLeft, copyToClipboard, cancelAutoClear } = useClipboardTimer();

  const fetchGeneratedPassword = useCallback(async () => {
    setIsGenerating(true);
    setPolicyError(null);
    setIsLowEntropyWarning(false);

    try {
      if (genMode === 'policy') {
        const policyRes = generatePolicyPassword({
          minLength,
          maxLength,
          exactSymbols,
          exactDigits,
          exactUpper,
          allowedSymbols,
          blocklist,
          mode: 'policy'
        });
        setGeneratedPassword(policyRes.password);
        setEntropyBits(policyRes.entropyBits);
        setIsLowEntropyWarning(policyRes.isLowEntropy);
      } else if (genMode === 'pronounceable') {
        const pronRes = generatePronounceablePassword({ minLength });
        setGeneratedPassword(pronRes.password);
        setEntropyBits(pronRes.entropyBits);
        setIsLowEntropyWarning(pronRes.isLowEntropy);
      } else if (genMode === 'diceware' && isDicewareEnabled) {
        let success = false;
        try {
          const query = new URLSearchParams({
            mode: 'diceware',
            word_count: wordCount.toString(),
            separator: separator
          });
          const res = await fetch(`/api/generate?${query.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setGeneratedPassword(data.password);
            setEntropyBits(data.entropy_bits);
            success = true;
          }
        } catch {
          // static build fallback
        }
        if (!success) {
          const diceRes = generateDicewarePassword({ wordCount, separator });
          setGeneratedPassword(diceRes.password);
          setEntropyBits(diceRes.entropyBits);
        }
      } else {
        let success = false;
        try {
          const query = new URLSearchParams({
            mode: 'random',
            length: length.toString(),
            symbols: includeSymbols.toString(),
            numbers: includeNumbers.toString(),
            exclude_ambiguous: excludeAmbiguous.toString()
          });
          const res = await fetch(`/api/generate?${query.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setGeneratedPassword(data.password);
            setEntropyBits(data.entropy_bits);
            success = true;
          }
        } catch {
          // static build fallback
        }
        if (!success) {
          const randRes = generateRandomPassword({
            length,
            includeSymbols,
            includeNumbers,
            excludeAmbiguous
          });
          setGeneratedPassword(randRes.password);
          setEntropyBits(randRes.entropyBits);
          setIsLowEntropyWarning(randRes.isLowEntropy);
        }
      }
    } catch (err) {
      console.error("Generator error:", err);
      setPolicyError(err.message || "Failed to generate password.");
    } finally {
      setIsGenerating(false);
    }
  }, [
    genMode, length, includeSymbols, includeNumbers, excludeAmbiguous,
    wordCount, separator, minLength, maxLength, exactSymbols, exactDigits,
    exactUpper, allowedSymbols, blocklist
  ]);

  // Initial and reactive fetch on control change
  useEffect(() => {
    fetchGeneratedPassword();
  }, [fetchGeneratedPassword]);

  const handleModeChange = (mode) => {
    playTactileSound('click');
    setGenMode(mode);
  };

  const handleGenerateClick = () => {
    playTactileSound('generate');
    fetchGeneratedPassword();
  };

  const handleCopy = () => {
    playTactileSound('copy');
    if (!generatedPassword) return;
    if (isCopyBufferEnabled) {
      copyToClipboard(generatedPassword, 30);
    } else {
      navigator.clipboard.writeText(generatedPassword);
    }
  };

  const handleApplyToAnalyzer = () => {
    playTactileSound('click');
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

      {/* Mode Selector Toggle */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#050505] p-1.5 rounded-lg border border-[#2d382c] font-mono text-xs">
        <button
          type="button"
          onClick={() => handleModeChange('random')}
          className={`py-2 px-2 rounded flex items-center justify-center gap-1.5 transition-all text-[11px] ${
            genMode === 'random'
              ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 font-bold'
              : 'text-[#849581] hover:text-[#e3e1ec]'
          }`}
        >
          <Key className="w-3 h-3" />
          <span>Random</span>
        </button>

        {isDicewareEnabled && (
          <button
            type="button"
            onClick={() => handleModeChange('diceware')}
            className={`py-2 px-2 rounded flex items-center justify-center gap-1.5 transition-all text-[11px] ${
              genMode === 'diceware'
                ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 font-bold'
                : 'text-[#849581] hover:text-[#e3e1ec]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Diceware</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleModeChange('policy')}
          className={`py-2 px-2 rounded flex items-center justify-center gap-1.5 transition-all text-[11px] ${
            genMode === 'policy'
              ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 font-bold'
              : 'text-[#849581] hover:text-[#e3e1ec]'
          }`}
        >
          <Settings2 className="w-3 h-3" />
          <span>Policy Rules</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('pronounceable')}
          className={`py-2 px-2 rounded flex items-center justify-center gap-1.5 transition-all text-[11px] ${
            genMode === 'pronounceable'
              ? 'bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/40 font-bold'
              : 'text-[#849581] hover:text-[#e3e1ec]'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Pronounceable</span>
        </button>
      </div>

      {/* Output Display */}
      <div className="bg-[#050505] border border-[#2d382c] p-4 rounded-lg flex flex-col gap-2 font-mono">
        <div className="flex justify-between items-center text-[10px] text-[#849581]">
          <span>GENERATED_OUTPUT ({genMode.toUpperCase()})</span>
          <span className={`font-bold ${isLowEntropyWarning ? 'text-amber-400' : 'text-[#00ff66]'}`}>
            ENTROPY: {entropyBits} BITS
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 text-base md:text-lg text-[#00ff66] text-glow tracking-wider overflow-x-auto whitespace-nowrap py-1">
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
              onClick={handleGenerateClick}
              disabled={isGenerating}
              className="p-2.5 rounded-lg bg-[#00ff66]/20 hover:bg-[#00ff66]/30 border border-[#00ff66]/40 text-[#00ff66] transition-all"
              title="Generate new password"
            >
              <Dices className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Validation Error Message */}
        {policyError && (
          <div className="mt-1 p-2 rounded bg-red-950/80 border border-red-800 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{policyError}</span>
          </div>
        )}

        {/* Low Entropy Policy Warning (v1.6 Section 2.3) */}
        {isLowEntropyWarning && (
          <div className="mt-1 p-2.5 rounded bg-amber-950/40 border border-amber-800/80 text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <span>
              <strong>Restricted Policy Warning:</strong> This site's password policy limits how strong a password can be here — consider a passphrase for your master accounts elsewhere, or ask the site to modernize its rules.
            </span>
          </div>
        )}

        {/* Auto-Expiring Buffer Active Countdown Badge */}
        {isCopyBufferEnabled && copied && timeLeft > 0 && (
          <div className="mt-2 pt-2 border-t border-[#1a241b] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#00ff66]">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Copied! Auto-clearing clipboard in <strong className="text-yellow-400">{timeLeft}s</strong></span>
            </div>
            <button
              onClick={cancelAutoClear}
              className="text-[10px] text-[#849581] hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <XCircle className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Controls: Policy Rules Mode (v1.6) */}
      {genMode === 'policy' && (
        <div className="space-y-3 font-mono text-xs text-[#e3e1ec] bg-[#050505] p-3 rounded-lg border border-[#2d382c]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#849581]">MIN_LENGTH</label>
              <input
                type="number"
                min={4}
                max={64}
                value={minLength}
                onChange={(e) => setMinLength(parseInt(e.target.value) || 4)}
                className="w-full terminal-input text-xs py-1.5 px-2 rounded bg-[#08090d] border border-[#2d382c]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#849581]">MAX_LENGTH</label>
              <input
                type="number"
                min={4}
                max={64}
                value={maxLength}
                onChange={(e) => setMaxLength(parseInt(e.target.value) || 4)}
                className="w-full terminal-input text-xs py-1.5 px-2 rounded bg-[#08090d] border border-[#2d382c]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-[#849581]">EXACT_SYMBOLS</label>
              <input
                type="number"
                min={0}
                max={10}
                value={exactSymbols}
                onChange={(e) => setExactSymbols(parseInt(e.target.value) || 0)}
                className="w-full terminal-input text-xs py-1 px-2 rounded bg-[#08090d] border border-[#2d382c]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#849581]">EXACT_DIGITS</label>
              <input
                type="number"
                min={0}
                max={10}
                value={exactDigits}
                onChange={(e) => setExactDigits(parseInt(e.target.value) || 0)}
                className="w-full terminal-input text-xs py-1 px-2 rounded bg-[#08090d] border border-[#2d382c]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#849581]">EXACT_UPPER</label>
              <input
                type="number"
                min={0}
                max={10}
                value={exactUpper}
                onChange={(e) => setExactUpper(parseInt(e.target.value) || 0)}
                className="w-full terminal-input text-xs py-1 px-2 rounded bg-[#08090d] border border-[#2d382c]"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[#849581]">ALLOWED_SYMBOLS_LIST</label>
            <input
              type="text"
              value={allowedSymbols}
              onChange={(e) => setAllowedSymbols(e.target.value)}
              placeholder="e.g. !@#$%"
              className="w-full terminal-input text-xs py-1.5 px-2 rounded bg-[#08090d] border border-[#2d382c]"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#849581]">DISALLOWED_BLOCKLIST (EXCLUDE)</label>
            <input
              type="text"
              value={blocklist}
              onChange={(e) => setBlocklist(e.target.value)}
              placeholder="e.g. &amp;&lt;&gt;%&quot;'"
              className="w-full terminal-input text-xs py-1.5 px-2 rounded bg-[#08090d] border border-[#2d382c]"
            />
          </div>
        </div>
      )}

      {/* Controls: Pronounceable Mode (v1.6) */}
      {genMode === 'pronounceable' && (
        <div className="space-y-3 font-mono text-xs text-[#e3e1ec] bg-[#050505] p-3 rounded-lg border border-[#2d382c]">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[#849581]">
              <span>TARGET_LENGTH</span>
              <span className="text-[#00ff66] font-bold">{minLength} CHARS</span>
            </div>
            <input
              type="range"
              min={8}
              max={32}
              value={minLength}
              onChange={(e) => setMinLength(parseInt(e.target.value))}
              className="w-full h-1.5 bg-[#08090d] rounded border border-[#2d382c] accent-[#00ff66] cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-[#849581] leading-relaxed">
            Generates memorable passwords using alternating CVC/CVCV consonant-vowel syllables powered by CSPRNG, with trailing digits &amp; symbols.
          </p>
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
