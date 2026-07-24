import React from 'react';
import { Cpu, Check, X, AlertCircle, Lightbulb } from 'lucide-react';

export default function HeuristicsBreakdown({ checks, suggestions }) {
  const checkItems = [
    { key: 'length_ok', label: 'Length ≥ 12 Chars', hint: '12+ recommended' },
    { key: 'has_lower', label: 'Lowercase (a-z)', hint: 'a-z present' },
    { key: 'has_upper', label: 'Uppercase (A-Z)', hint: 'A-Z present' },
    { key: 'has_digit', label: 'Numeric (0-9)', hint: '0-9 present' },
    { key: 'has_symbol', label: 'Symbol (!@#$)', hint: 'Special char present' },
    { key: 'is_common_password', label: 'Dictionary Immunity', passValue: false, hint: 'Not in top-10k bad list' },
    { key: 'has_sequential_chars', label: 'Non-Sequential', passValue: false, hint: 'No abc/123/aaa runs' },
  ];

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#849581]">
          <Cpu className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-02: HEURISTICS_BREAKDOWN</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1b22] text-[#849581] border border-[#2d382c]">
          7 RULES ACTIVE
        </span>
      </div>

      {/* Security Checks Chips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {checkItems.map((item) => {
          const rawValue = checks ? checks[item.key] : false;
          // For dictionary and sequential, false is good (passed)
          const passed = item.passValue !== undefined ? rawValue === item.passValue : Boolean(rawValue);

          return (
            <div
              key={item.key}
              className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                passed
                  ? 'bg-[#00ff66]/5 border-[#00ff66]/40 text-[#e3e1ec]'
                  : 'bg-red-950/20 border-red-900/40 text-[#849581]'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    passed ? 'bg-[#00ff66]/20 text-[#00ff66]' : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {passed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                </div>
                <span>{item.label}</span>
              </div>
              <span className={`text-[10px] font-mono ${passed ? 'text-[#00ff66]' : 'text-red-400'}`}>
                {passed ? 'PASS' : 'FAIL'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Suggestions List */}
      <div className="mt-auto bg-[#050505] border border-[#2d382c] p-4 rounded-lg space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[#00ff66] font-semibold">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span>SECURITY_IMPROVEMENT_TIPS</span>
        </div>
        <ul className="space-y-1.5 text-xs font-mono text-[#849581]">
          {suggestions && suggestions.length > 0 ? (
            suggestions.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-[#00ff66] font-bold">&gt;</span>
                <span>{tip}</span>
              </li>
            ))
          ) : (
            <li className="flex items-center gap-2 text-emerald-400">
              <span className="text-[#00ff66] font-bold">&gt;</span>
              <span>All heuristic criteria satisfied cleanly!</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
