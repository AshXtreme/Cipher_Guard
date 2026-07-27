import React, { useState, useMemo } from 'react';
import { Lock, Shield, Download, AlertTriangle, CheckCircle2, RefreshCw, Key, Sparkles } from 'lucide-react';
import { exportEncryptedVault, triggerVaultDownload } from '../utils/vaultExporter';

export default function VaultExportModal({ currentPassword = '', currentAnalyzerPassword = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [masterPassphrase, setMasterPassphrase] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Compute live passphrase strength
  const passphraseStrength = useMemo(() => {
    if (!masterPassphrase) return { score: 0, label: 'Awaiting Input' };
    let hasLower = /[a-z]/.test(masterPassphrase);
    let hasUpper = /[A-Z]/.test(masterPassphrase);
    let hasDigit = /[0-9]/.test(masterPassphrase);
    let hasSymbol = /[^a-zA-Z0-9]/.test(masterPassphrase);
    let poolSize = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSymbol ? 32 : 0);
    if (poolSize === 0) poolSize = 26;

    const bits = Math.round(masterPassphrase.length * Math.log2(poolSize));
    let score = Math.min(100, Math.round((bits / 80) * 100));
    if (masterPassphrase.length < 8) score = Math.min(score, 30);

    let label = "Weak";
    if (score >= 80) label = "Robust";
    else if (score >= 50) label = "Fair";

    return { score, label, bits };
  }, [masterPassphrase]);

  // Selected candidate items for export
  const candidates = useMemo(() => {
    const list = [];
    if (currentPassword) {
      list.push({ label: "Analyzer String", value: currentPassword, timestamp: new Date().toISOString() });
    }
    if (currentAnalyzerPassword && currentAnalyzerPassword !== currentPassword) {
      list.push({ label: "Generator Output", value: currentAnalyzerPassword, timestamp: new Date().toISOString() });
    }
    if (list.length === 0) {
      list.push({ label: "Demo Credential", value: "xQ7$mPz2!vT9@wLk", timestamp: new Date().toISOString() });
    }
    return list;
  }, [currentPassword, currentAnalyzerPassword]);

  const handleExport = async () => {
    if (!masterPassphrase) {
      setExportError("Please specify a master export passphrase.");
      return;
    }
    if (passphraseStrength.score < 30) {
      setExportError("Master passphrase is too weak. Choose a longer, higher-entropy passphrase.");
      return;
    }

    setExportError(null);
    setIsExporting(true);

    try {
      const vaultPackage = await exportEncryptedVault(candidates, masterPassphrase);
      triggerVaultDownload(vaultPackage, `cipherguard-vault-${new Date().toISOString().slice(0, 10)}.cgvault`);
      setIsOpen(false);
      setMasterPassphrase('');
    } catch (err) {
      setExportError(err.message || "Failed to generate encrypted vault.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-4 w-full font-mono">
      {/* Panel Header */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs text-[#849581]">
          <Lock className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-09: ENCRYPTED_VAULT_EXPORT</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1 rounded bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30 text-xs font-bold hover:bg-[#00ff66]/20 transition-all flex items-center gap-1.5"
        >
          <Shield className="w-3.5 h-3.5" />
          {isOpen ? "CLOSE_EXPORT_VAULT" : "EXPORT_ENCRYPTED_VAULT (AES-GCM)"}
        </button>
      </div>

      {/* Export Form Body */}
      {isOpen && (
        <div className="flex flex-col gap-4 p-4 rounded-lg bg-[#050505] border border-[#2d382c] text-xs">
          {/* Persistent Privacy Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0 mt-0.5" />
            <span>
              <strong>Local-Only Encryption:</strong> This file is encrypted with your master export passphrase using <strong>AES-256-GCM + PBKDF2</strong>. It will download directly to your device and is <strong>never sent to any server</strong>.
            </span>
          </div>

          {/* Master Passphrase Input */}
          <div className="space-y-2">
            <label className="block text-xs text-[#00ff66] font-semibold">
              MASTER_EXPORT_PASSPHRASE (REQUIRED FOR ENCRYPTION)
            </label>
            <input
              type="password"
              value={masterPassphrase}
              onChange={(e) => setMasterPassphrase(e.target.value)}
              placeholder="Set a strong master passphrase..."
              className="w-full terminal-input font-mono text-sm py-2.5 px-3 rounded-lg bg-[#08090d] border border-[#2d382c] focus:border-[#00ff66]"
            />
            {masterPassphrase && (
              <div className="flex justify-between items-center text-[10px] pt-1">
                <span className="text-[#849581]">Master Entropy: {passphraseStrength.bits} BITS</span>
                <span className={`font-bold ${passphraseStrength.score >= 50 ? 'text-[#00ff66]' : 'text-amber-400'}`}>
                  {passphraseStrength.label.toUpperCase()} ({passphraseStrength.score}/100)
                </span>
              </div>
            )}
          </div>

          {/* Export Items Summary */}
          <div className="space-y-1.5 bg-[#08090d] p-3 rounded border border-[#1a241b]">
            <span className="text-[10px] text-[#849581] block">INCLUDED SESSION CREDENTIALS ({candidates.length})</span>
            {candidates.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px] text-[#e3e1ec]">
                <span className="text-[#849581]">{item.label}:</span>
                <span className="font-mono">{item.value.slice(0, 8)}••••••••</span>
              </div>
            ))}
          </div>

          {/* Error Message */}
          {exportError && (
            <div className="text-red-400 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-2.5 rounded-lg bg-[#00ff66] text-[#050505] font-bold text-xs hover:bg-[#00ff66]/90 transition-all flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Deriving Key &amp; Encrypting AES-GCM...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                DOWNLOAD ENCRYPTED VAULT (.CGVAULT)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
