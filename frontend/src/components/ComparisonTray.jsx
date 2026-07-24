import React, { useState } from 'react';
import { Columns3, Plus, Trash2, ShieldAlert, ShieldCheck, Eye, EyeOff, Lock, RefreshCw, AlertCircle } from 'lucide-react';

const isComparisonEnabled = import.meta.env.VITE_FEATURE_COMPARISON === 'true';

export default function ComparisonTray({ currentAnalyzerPassword }) {
  const [candidates, setCandidates] = useState([]); // Array of candidate objects
  const [newInput, setNewInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [visibleMap, setVisibleMap] = useState({});

  if (!isComparisonEnabled) return null;

  // Helper to hash password to SHA-1 prefix
  const getSha1Prefix = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return { prefix: hex.substring(0, 5), fullHash: hex };
  };

  // Evaluate candidate via existing /api/analyze and /api/breach-check endpoints
  const evaluateCandidate = async (passwordText) => {
    if (!passwordText || candidates.length >= 3) return;

    // Check if already in list
    if (candidates.some(c => c.password === passwordText)) return;

    setIsAnalyzing(true);
    try {
      // 1. Analyze endpoint
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordText })
      });
      const analyzeData = await analyzeRes.json();

      // 2. Client-side SHA-1 prefix for k-anonymity breach check
      const { prefix, fullHash } = await getSha1Prefix(passwordText);
      const breachRes = await fetch(`/api/breach-check?prefix=${prefix}`);
      const breachData = await breachRes.json();

      const suffix = fullHash.substring(5);
      const match = (breachData.suffixes || []).find(s => s.suffix === suffix);
      const breachCount = match ? match.count : 0;

      // 3. Approximate bit entropy calculation: length * 6.55 or exact pool size
      const entropyBits = Math.round(passwordText.length * 6.55 * 100) / 100;

      const newCandidate = {
        id: Date.now() + Math.random().toString(36).substring(2, 7),
        password: passwordText,
        score: analyzeData.score,
        label: analyzeData.label,
        checks: analyzeData.checks,
        entropyBits,
        breachCount
      };

      setCandidates(prev => [...prev.slice(0, 2), newCandidate]);
    } catch (err) {
      console.error("Failed to analyze comparison candidate:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (newInput.trim()) {
      evaluateCandidate(newInput.trim());
      setNewInput('');
    }
  };

  const handleAddCurrent = () => {
    if (currentAnalyzerPassword) {
      evaluateCandidate(currentAnalyzerPassword);
    }
  };

  const handleRemove = (id) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const handleClearAll = () => {
    setCandidates([]);
  };

  const toggleVisibility = (id) => {
    setVisibleMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-5 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#849581]">
          <Columns3 className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-05: PASSWORD_HEALTH_COMPARISON_MATRIX</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1b22] text-[#00ff66] border border-[#00ff66]/30">
            CANDIDATES: {candidates.length}/3
          </span>
          {candidates.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs font-mono px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 flex items-center gap-1 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Mandatory In-Memory Privacy Disclaimer Banner */}
      {candidates.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#00ff66]/10 border border-[#00ff66]/40 font-mono text-xs text-[#00ff66]">
          <Lock className="w-4 h-4 text-[#00ff66] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>In-Memory Privacy Guarantee:</strong> Comparison data is kept in memory only and is cleared when you refresh or leave this page. It is never sent anywhere except for the same strength/breach checks used elsewhere in this app.
          </p>
        </div>
      )}

      {/* Input Controls to Add Candidate */}
      {candidates.length < 3 && (
        <form onSubmit={handleAddSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center bg-[#050505] border border-[#2d382c] focus-within:border-[#00ff66] rounded-lg px-3 py-2 transition-all">
            <input
              type="password"
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              placeholder="Enter candidate password to compare..."
              className="bg-transparent border-none outline-none w-full text-xs font-mono text-[#00ff66] placeholder-[#849581]"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isAnalyzing || !newInput.trim()}
              className="px-4 py-2 rounded-lg bg-[#00ff66]/20 hover:bg-[#00ff66]/30 border border-[#00ff66]/40 text-[#00ff66] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
            >
              {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Candidate</span>
            </button>

            {currentAnalyzerPassword && (
              <button
                type="button"
                onClick={handleAddCurrent}
                disabled={isAnalyzing || candidates.some(c => c.password === currentAnalyzerPassword)}
                className="px-3 py-2 rounded-lg bg-[#1a1b22] hover:bg-[#252630] border border-[#2d382c] text-[#e3e1ec] text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-40"
                title="Add current active password from console"
              >
                <span>+ From Console</span>
              </button>
            )}
          </div>
        </form>
      )}

      {/* Empty State */}
      {candidates.length === 0 && (
        <div className="p-8 border border-dashed border-[#2d382c] rounded-xl text-center flex flex-col items-center gap-2">
          <Columns3 className="w-8 h-8 text-[#849581] opacity-60" />
          <p className="text-xs font-mono text-[#849581]">
            No candidates in comparison tray. Add up to 3 candidate passwords to compare scores, entropy, and breach vulnerability side-by-side.
          </p>
        </div>
      )}

      {/* Side-by-Side Comparison Matrix */}
      {candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {candidates.map((candidate, idx) => {
            const isVisible = !!visibleMap[candidate.id];
            const isBreached = candidate.breachCount > 0;

            return (
              <div
                key={candidate.id}
                className="bg-[#050505] border border-[#2d382c] hover:border-[#00ff66]/50 rounded-xl p-4 flex flex-col gap-4 relative transition-all"
              >
                {/* Header Badge & Remove Button */}
                <div className="flex items-center justify-between border-b border-[#2d382c] pb-2">
                  <span className="text-[10px] font-bold text-[#00ff66] px-2 py-0.5 bg-[#00ff66]/10 rounded border border-[#00ff66]/30">
                    CANDIDATE #{idx + 1}
                  </span>
                  <button
                    onClick={() => handleRemove(candidate.id)}
                    className="p-1 rounded text-[#849581] hover:text-red-400 hover:bg-red-950/40 transition-colors"
                    title="Remove candidate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Candidate Password Text with Toggle */}
                <div className="flex items-center justify-between bg-[#0c0d12] p-2.5 rounded-lg border border-[#2d382c]">
                  <span className="text-xs text-[#00ff66] font-mono text-glow truncate max-w-[170px]">
                    {isVisible ? candidate.password : '•'.repeat(Math.min(candidate.password.length, 16))}
                  </span>
                  <button
                    onClick={() => toggleVisibility(candidate.id)}
                    className="text-[#849581] hover:text-[#e3e1ec] p-1"
                  >
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Score & Rating Label */}
                <div className="flex items-center justify-between">
                  <span className="text-[#849581]">SCORE & RATING</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#00ff66] text-glow">{candidate.score}/100</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1b22] text-[#e3e1ec] border border-[#2d382c]">
                      {candidate.label}
                    </span>
                  </div>
                </div>

                {/* Entropy Readout */}
                <div className="flex items-center justify-between">
                  <span className="text-[#849581]">BIT ENTROPY</span>
                  <span className="text-xs font-bold text-[#00ff66]">{candidate.entropyBits} BITS</span>
                </div>

                {/* Breach Status */}
                <div className="flex items-center justify-between">
                  <span className="text-[#849581]">BREACH VULNERABILITY</span>
                  {isBreached ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 flex items-center gap-1 font-bold">
                      <ShieldAlert className="w-3 h-3" />
                      {candidate.breachCount.toLocaleString()} Matches
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      0 Matches
                    </span>
                  )}
                </div>

                {/* Heuristics Rules Passed / Failed List */}
                <div className="space-y-1.5 pt-2 border-t border-[#2d382c]">
                  <span className="text-[10px] text-[#849581] uppercase tracking-wider">RULE CHECKS</span>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className={`px-2 py-1 rounded flex items-center gap-1 ${candidate.checks?.length ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/40 text-red-400 border border-red-800/40'}`}>
                      <span>Length &ge; 12</span>
                    </div>
                    <div className={`px-2 py-1 rounded flex items-center gap-1 ${candidate.checks?.has_lower ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/40 text-red-400 border border-red-800/40'}`}>
                      <span>Lowercase</span>
                    </div>
                    <div className={`px-2 py-1 rounded flex items-center gap-1 ${candidate.checks?.has_upper ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/40 text-red-400 border border-red-800/40'}`}>
                      <span>Uppercase</span>
                    </div>
                    <div className={`px-2 py-1 rounded flex items-center gap-1 ${candidate.checks?.has_digit ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/40 text-red-400 border border-red-800/40'}`}>
                      <span>Numbers</span>
                    </div>
                    <div className={`px-2 py-1 rounded flex items-center gap-1 ${candidate.checks?.has_symbol ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/40 text-red-400 border border-red-800/40'}`}>
                      <span>Symbols</span>
                    </div>
                    <div className={`px-2 py-1 rounded flex items-center gap-1 ${!candidate.checks?.is_common ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-red-950/40 text-red-400 border border-red-800/40'}`}>
                      <span>Dict Immunity</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
