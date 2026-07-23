import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Terminal, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function LiveAnalyzerConsole({
  password,
  setPassword,
  analysis,
  breachInfo,
  isLoading
}) {
  const [showPassword, setShowPassword] = useState(false);

  const score = analysis?.score ?? 0;
  const label = analysis?.label ?? "Awaiting Input";

  // Segment colors based on score
  const getSegmentClass = (index) => {
    const threshold = (index / 20) * 100;
    if (score === 0 || threshold >= score) return "led-segment";
    if (score <= 40) return "led-segment active-red";
    if (score <= 70) return "led-segment active-yellow";
    return "led-segment active-green";
  };

  const getLabelColor = () => {
    if (score <= 20) return "text-red-500 text-glow-red";
    if (score <= 40) return "text-orange-400";
    if (score <= 60) return "text-yellow-400";
    if (score <= 80) return "text-[#00ff66]";
    return "text-[#00ff66] text-glow";
  };

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-6 h-full">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#849581]">
          <span className="w-2.5 h-2.5 bg-[#00ff66] rounded-full glow-accent animate-pulse" />
          <span>MOD-01: LIVE_ANALYZER_CONSOLE</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <RefreshCw className="w-4 h-4 text-[#00ff66] animate-spin" />}
          <Terminal className="w-4 h-4 text-[#849581]" />
        </div>
      </div>

      {/* Target Input Field */}
      <div className="space-y-2">
        <label className="block text-xs font-mono text-[#00ff66] tracking-wider font-semibold">
          TARGET_STRING_ANALYSIS
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type candidate password..."
            autoComplete="new-password"
            maxLength={256}
            className="w-full terminal-input font-mono text-lg md:text-xl py-3.5 pl-11 pr-12 rounded-lg"
          />
          <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#00ff66]/70" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#849581] hover:text-[#00ff66] transition-colors"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Score Display & LED Meter */}
      <div className="bg-[#050505] border border-[#2d382c] p-6 rounded-lg relative flex flex-col gap-5">
        <div className="flex justify-between items-center text-[11px] font-mono text-[#849581]">
          <span>SYS_ENTROPY_RATING</span>
          <span className={`font-bold tracking-wider ${getLabelColor()}`}>{label.toUpperCase()}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-6">
          <div className="flex items-baseline">
            <span className={`text-6xl md:text-7xl font-bold font-mono leading-none ${getLabelColor()}`}>
              {score}
            </span>
            <span className="text-2xl text-[#849581] font-mono font-normal">/100</span>
          </div>

          {/* 20-Segment LED Meter */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-mono text-[#849581]">
              <span>WEAK (0)</span>
              <span>FAIR (50)</span>
              <span>ROBUST (100)</span>
            </div>
            <div className="grid grid-cols-20 gap-1 h-6 bg-[#08090d] p-1 rounded border border-[#1a241b]">
              {Array.from({ length: 20 }).map((_, idx) => (
                <div key={idx} className={`h-full rounded-xs ${getSegmentClass(idx)}`} />
              ))}
            </div>
          </div>
        </div>

        {/* HIBP Breach Telemetry Pill */}
        {password && (
          <div className="mt-2 pt-3 border-t border-[#1a241b] flex items-center justify-between text-xs font-mono">
            <span className="text-[#849581]">HIBP k-Anonymity Status:</span>
            {breachInfo ? (
              breachInfo.count > 0 ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/80 border border-red-800 text-red-400 font-semibold">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Pwned! Exposed in {breachInfo.count.toLocaleString()} breaches
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800 text-[#00ff66] font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
                  Clean — 0 breach matches found
                </span>
              )
            ) : (
              <span className="flex items-center gap-1.5 text-[#849581]">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                Querying k-anonymity proxy...
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
