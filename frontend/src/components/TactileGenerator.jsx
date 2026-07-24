import React, { useState, useCallback } from 'react';
import { Sliders, Dices, Copy, Check, Shield } from 'lucide-react';

export default function TactileGenerator({ onGenerateToAnalyzer }) {
  const [length, setLength] = useState(16);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [entropyBits, setEntropyBits] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchGeneratedPassword = useCallback(async () => {
    setIsGenerating(true);
    try {
      const query = new URLSearchParams({
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
      }
    } catch (err) {
      console.error("Failed to generate password:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [length, includeSymbols, includeNumbers, excludeAmbiguous]);

  // Initial generator call on mount
  React.useEffect(() => {
    fetchGeneratedPassword();
  }, [fetchGeneratedPassword]);

  const handleCopy = () => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          SECRETS_RNG
        </span>
      </div>

      {/* Output Slot Machine Display */}
      <div className="bg-[#050505] border border-[#2d382c] p-4 rounded-lg flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-[#849581]">
          <span>GENERATED_OUTPUT</span>
          <span className="text-[#00ff66] font-bold">
            ENTROPY: {entropyBits} BITS
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 font-mono text-lg md:text-xl text-[#00ff66] text-glow tracking-widest overflow-x-auto whitespace-nowrap py-1">
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
      </div>

      {/* Control Sliders & Toggles */}
      <div className="space-y-4 font-mono text-xs text-[#e3e1ec]">
        {/* Length Slider */}
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

        {/* Checkbox Options */}
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

      {/* Action CTA */}
      <button
        onClick={handleApplyToAnalyzer}
        className="mt-auto w-full py-3 rounded-lg bg-[#00ff66]/15 hover:bg-[#00ff66]/25 border border-[#00ff66]/50 text-[#00ff66] font-mono font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all glow-accent"
      >
        <Shield className="w-4 h-4" />
        <span>ANALYZE THIS GENERATED PASSWORD IN CONSOLE</span>
      </button>
    </div>
  );
}
