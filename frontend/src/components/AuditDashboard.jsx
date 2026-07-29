import React, { useState, useRef } from 'react';
import { BarChart3, ShieldAlert, Upload, Trash2, FileText, AlertCircle, Copy, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { auditPasswordBatch } from '../utils/auditEngine';

export default function AuditDashboard() {
  const [inputText, setInputText] = useState('');
  const [auditResult, setAuditResult] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const fileInputRef = useRef(null);

  const handleRunAudit = () => {
    if (!inputText.trim()) return;
    const result = auditPasswordBatch(inputText);
    setAuditResult(result);
  };

  const handleClearAudit = () => {
    setInputText('');
    setAuditResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setInputText(text);
      // Auto run audit on file import
      const result = auditPasswordBatch(text);
      setAuditResult(result);
    };
    reader.readAsText(file);
  };

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-5 w-full font-mono text-xs select-none">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs text-[#849581]">
          <BarChart3 className="w-4 h-4 text-[#00ff66]" />
          <span className="font-bold text-[#00ff66]">MOD-12: INTERACTIVE_PASSWORD_AUDIT_DASHBOARD</span>
        </div>
        <span className="text-[10px] text-[#849581] hidden sm:inline px-2 py-0.5 rounded bg-[#1a1b22] text-[#00ff66] border border-[#00ff66]/30">
          BATCH_CLIENT_SIDE_ONLY
        </span>
      </div>

      {/* Mandatory In-Browser Privacy Disclosure (Section 4.3) */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-emerald-300 leading-relaxed text-[11px]">
        <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0 mt-0.5" />
        <span>
          <strong>In-Browser Batch Privacy Guarantee:</strong> This batch is analyzed entirely in your browser. Nothing here is sent anywhere or saved — it disappears when you refresh or leave this page.
        </span>
      </div>

      {/* Input Controls Panel */}
      <div className="bg-[#050505] p-4 rounded-lg border border-[#2d382c] flex flex-col gap-3">
        <div className="flex justify-between items-center text-[10px] text-[#849581]">
          <span>PASTE_BATCH_PASSWORDS (ONE PER LINE OR 'LABEL: PASSWORD')</span>
          <span>FILEREADER_LOCAL_IMPORT</span>
        </div>

        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Email: MyP@ssw0rd!2026\nBanking: xQ7$mPz2!vT9@wLk\nSocial: 123456\nWork: CorrectHorseBatteryStaple`}
          rows={4}
          className="w-full terminal-input font-mono text-xs p-3 rounded bg-[#08090d] border border-[#2d382c] focus:border-[#00ff66] text-[#e3e1ec] leading-relaxed resize-y"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* File Upload Button */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded bg-[#1a1b22] hover:bg-[#252630] border border-[#2d382c] hover:border-[#00ff66] text-[#00ff66] transition-all flex items-center gap-1.5 text-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Local File (.txt/.csv)</span>
            </button>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2">
            {auditResult && (
              <button
                onClick={handleClearAudit}
                className="px-3 py-2 rounded bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-400 transition-all flex items-center gap-1.5 text-xs"
                title="Purge all batch passwords from browser memory"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Audit</span>
              </button>
            )}

            <button
              onClick={handleRunAudit}
              disabled={isAuditing || !inputText.trim()}
              className="px-4 py-2 rounded bg-[#00ff66]/20 hover:bg-[#00ff66]/30 border border-[#00ff66]/40 text-[#00ff66] font-bold transition-all flex items-center gap-1.5 text-xs disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAuditing ? 'Analyzing...' : 'Run Batch Audit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Results Section */}
      {auditResult && (
        <div className="flex flex-col gap-5 pt-2">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#050505] p-3 rounded-lg border border-[#2d382c] flex flex-col gap-1">
              <span className="text-[10px] text-[#849581]">TOTAL_ANALYZED</span>
              <span className="text-lg font-bold text-[#00ff66]">{auditResult.totalCount} Passwords</span>
            </div>

            <div className="bg-[#050505] p-3 rounded-lg border border-[#2d382c] flex flex-col gap-1">
              <span className="text-[10px] text-[#849581]">AVERAGE_HEALTH_SCORE</span>
              <span className="text-lg font-bold text-[#00ff66]">{auditResult.avgScore} / 100</span>
            </div>

            <div className="bg-[#050505] p-3 rounded-lg border border-[#2d382c] flex flex-col gap-1">
              <span className="text-[10px] text-[#849581]">REUSED_DUPLICATES</span>
              <span className={`text-lg font-bold ${auditResult.duplicateCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {auditResult.duplicateCount} Reused
              </span>
            </div>

            <div className="bg-[#050505] p-3 rounded-lg border border-[#2d382c] flex flex-col gap-1">
              <span className="text-[10px] text-[#849581]">AVG_ENTROPY</span>
              <span className="text-lg font-bold text-[#00ff66]">{auditResult.avgEntropy} Bits</span>
            </div>
          </div>

          {/* Reuse Detector Alert Banner */}
          {auditResult.duplicateCount > 0 && (
            <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 flex flex-col gap-1.5 leading-relaxed text-[11px]">
              <div className="flex items-center gap-2 font-bold text-red-400">
                <ShieldAlert className="w-4 h-4" />
                <span>CRITICAL REUSE DETECTED: {auditResult.duplicateCount} Duplicate Passwords Found!</span>
              </div>
              <p className="text-red-300/90 text-[11px]">
                Reusing the same password across multiple services means a single breach compromises all linked accounts. Replace duplicate entries with unique generated passphrases.
              </p>
            </div>
          )}

          {/* Weak Link Alert Banner */}
          {auditResult.weakestEntry && (
            <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-300 flex flex-col gap-1.5 leading-relaxed text-[11px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>WEAKEST LINK ALERT: Entry "{auditResult.weakestEntry.label}"</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 font-bold text-[10px]">
                  Score: {auditResult.weakestEntry.score}/100
                </span>
              </div>
              <p className="text-amber-300/90 text-[11px]">
                Target this entry first for immediate rotation. It has low entropy ({auditResult.weakestEntry.entropyBits} bits) and pulls down your overall security posture.
              </p>
            </div>
          )}

          {/* Entropy/Score Distribution Chart (PRD Section 4.2 - No Age Axis) */}
          <div className="bg-[#050505] p-4 rounded-lg border border-[#2d382c] flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-[#1a241b] pb-2">
              <span className="font-bold text-xs text-[#00ff66]">ENTROPY / SCORE DISTRIBUTION CHART</span>
              <span className="text-[10px] text-[#849581]">BATCH_TIER_BREAKDOWN</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                { key: 'WEAK', label: 'Weak (< 40)', color: 'bg-red-500', count: auditResult.distribution.WEAK },
                { key: 'MODERATE', label: 'Moderate (40-59)', color: 'bg-amber-400', count: auditResult.distribution.MODERATE },
                { key: 'STRONG', label: 'Strong (60-79)', color: 'bg-emerald-400', count: auditResult.distribution.STRONG },
                { key: 'EXCELLENT', label: 'Excellent (80+)', color: 'bg-[#00ff66]', count: auditResult.distribution.EXCELLENT }
              ].map((tier) => {
                const percentage = auditResult.totalCount > 0 ? Math.round((tier.count / auditResult.totalCount) * 100) : 0;
                return (
                  <div key={tier.key} className="bg-[#08090d] p-3 rounded border border-[#1a241b] flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[10px] text-[#849581]">
                      <span>{tier.label}</span>
                      <span className="font-bold text-[#e3e1ec]">{tier.count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-[#1a241b] h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${tier.color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch Breakdown Table */}
          <div className="bg-[#050505] rounded-lg border border-[#2d382c] overflow-hidden">
            <div className="p-3 border-b border-[#1a241b] bg-[#08090d] font-bold text-xs text-[#00ff66]">
              BATCH_AUDIT_ENTRY_LIST ({auditResult.entries.length} ITEMS)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-[#0c0d12] text-[#849581] border-b border-[#1a241b]">
                  <tr>
                    <th className="p-2.5">LABEL</th>
                    <th className="p-2.5">LENGTH</th>
                    <th className="p-2.5">ENTROPY</th>
                    <th className="p-2.5">HEALTH SCORE</th>
                    <th className="p-2.5">TIER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a241b]">
                  {auditResult.entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-[#08090d] transition-colors">
                      <td className="p-2.5 font-bold text-[#e3e1ec]">{entry.label}</td>
                      <td className="p-2.5 text-[#849581]">{entry.length} chars</td>
                      <td className="p-2.5 text-[#00ff66]">{entry.entropyBits} bits</td>
                      <td className="p-2.5 font-bold text-[#00ff66]">{entry.score} / 100</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.tier === 'WEAK' ? 'bg-red-950/80 text-red-400 border border-red-800' :
                          entry.tier === 'MODERATE' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' :
                          'bg-emerald-950/80 text-[#00ff66] border border-emerald-800'
                        }`}>
                          {entry.tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
