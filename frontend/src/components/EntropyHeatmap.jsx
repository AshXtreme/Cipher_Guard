import React, { useMemo } from 'react';
import { ShieldAlert, Sparkles, Hash, Type, EyeOff } from 'lucide-react';

/**
 * Analyzes string and returns per-character category classifications.
 * Categories: 'red' (sequential/repeated/dictionary), 'green' (symbol), 'yellow' (digit), 'blue' (letter).
 */
export function classifyPasswordCharacters(text) {
  if (!text) return { characters: [], counts: { green: 0, blue: 0, yellow: 0, red: 0 } };

  const len = text.length;
  const lower = text.toLowerCase();
  const categories = new Array(len).fill(null);

  // 1. Identify 3+ sequential runs (abc, 123, 321, cba)
  for (let i = 0; i < len - 2; i++) {
    const c1 = lower.charCodeAt(i);
    const c2 = lower.charCodeAt(i + 1);
    const c3 = lower.charCodeAt(i + 2);

    const isAscending = (c2 === c1 + 1) && (c3 === c2 + 1);
    const isDescending = (c2 === c1 - 1) && (c3 === c2 - 1);

    if (isAscending || isDescending) {
      categories[i] = 'red';
      categories[i + 1] = 'red';
      categories[i + 2] = 'red';
    }
  }

  // 2. Identify 3+ repeated character runs (aaa, 111)
  for (let i = 0; i < len - 2; i++) {
    if (lower[i] === lower[i + 1] && lower[i + 1] === lower[i + 2]) {
      categories[i] = 'red';
      categories[i + 1] = 'red';
      categories[i + 2] = 'red';
    }
  }

  // 3. Identify common dictionary substrings (password, admin, welcome, 123456, etc.)
  const commonWords = ['password', 'admin', 'welcome', '123456', 'qwerty', 'letmein'];
  for (const word of commonWords) {
    let idx = lower.indexOf(word);
    while (idx !== -1) {
      for (let k = idx; k < idx + word.length; k++) {
        categories[k] = 'red';
      }
      idx = lower.indexOf(word, idx + 1);
    }
  }

  // 4. Fill remaining unflagged character classes
  const counts = { green: 0, blue: 0, yellow: 0, red: 0 };
  const characters = [];

  for (let i = 0; i < len; i++) {
    const char = text[i];
    let cat = categories[i];

    if (!cat) {
      if (/[^a-zA-Z0-9]/.test(char)) {
        cat = 'green';
      } else if (/[0-9]/.test(char)) {
        cat = 'yellow';
      } else if (/[a-zA-Z]/.test(char)) {
        cat = 'blue';
      } else {
        cat = 'blue';
      }
    }

    counts[cat]++;
    characters.push({ char, category: cat, index: i });
  }

  return { characters, counts };
}

export default function EntropyHeatmap({ password, showPassword = false }) {
  const { characters, counts } = useMemo(() => {
    return classifyPasswordCharacters(password);
  }, [password]);

  if (!password) return null;

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-[#050505] border border-[#2d382c] font-mono text-xs select-none">
      <div className="flex items-center justify-between border-b border-[#1a241b] pb-2 text-[11px] text-[#849581]">
        <span className="font-bold flex items-center gap-1.5 text-[#00ff66]">
          <Sparkles className="w-3.5 h-3.5" />
          ENTROPY_HEATMAP &amp; CHARACTER_BREAKDOWN
        </span>
        <span className="text-[10px] text-[#849581]">
          {showPassword ? "POSITIONAL_BREAKDOWN" : "AGGREGATE_SUMMARY (SHOULDER_SURF_PROTECTED)"}
        </span>
      </div>

      {/* Masked vs Unmasked Display Logic */}
      {!showPassword ? (
        /* Masked State (showPassword = false): Aggregate non-positional summary only to prevent shoulder-surfing pattern leaks */
        <div className="flex items-center gap-3 py-1 flex-wrap" aria-label="Aggregate character breakdown">
          <div className="flex items-center gap-1 text-[#849581]">
            <EyeOff className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[11px]">Masked Summary:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[#00ff66] font-bold text-[11px]" title="Symbols">
              🟢×{counts.green} Symbols
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-400 font-bold text-[11px]" title="Letters">
              🔵×{counts.blue} Letters
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-400 font-bold text-[11px]" title="Numbers">
              🟡×{counts.yellow} Numbers
            </span>
            {counts.red > 0 && (
              <span className="px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-400 font-bold text-[11px]" title="Flagged Repeats/Sequential">
                🔴×{counts.red} Weak Patterns
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Unmasked State (showPassword = true): Full per-character positional color breakdown */
        <div
          className="flex items-center gap-1 py-1 overflow-x-auto"
          aria-label="Positional character entropy heatmap"
        >
          {characters.map((item, idx) => {
            let bgClass = "bg-blue-950/80 border-blue-700 text-blue-300";
            let glyph = "Aa";

            if (item.category === 'green') {
              bgClass = "bg-emerald-950/80 border-emerald-600 text-[#00ff66]";
              glyph = "❖";
            } else if (item.category === 'yellow') {
              bgClass = "bg-amber-950/80 border-amber-600 text-amber-300";
              glyph = "12";
            } else if (item.category === 'red') {
              bgClass = "bg-red-950/90 border-red-600 text-red-300 animate-pulse";
              glyph = "⚠️";
            }

            return (
              <div
                key={idx}
                className={`flex flex-col items-center justify-center min-w-[28px] h-10 px-1 rounded border font-mono font-bold text-sm ${bgClass}`}
                title={`Pos ${idx + 1}: '${item.char}' (${item.category.toUpperCase()})`}
              >
                <span>{item.char}</span>
                <span className="text-[8px] opacity-75 font-normal leading-none">{glyph}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend & Accessibility Key */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1a241b] text-[10px] text-[#849581] flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00ff66]" />
          <span>🟢 Symbols (❖)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>🔵 Letters (Aa)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>🟡 Numbers (12)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span>🔴 Weak Run (⚠️)</span>
        </div>
      </div>
    </div>
  );
}
