import React, { useState, useMemo, useRef } from 'react';
import { Lock, Shield, Download, Upload, AlertTriangle, CheckCircle2, RefreshCw, FileText, Key, Sparkles, FolderUp, FileCheck } from 'lucide-react';
import { exportEncryptedVault, decryptEncryptedVault, triggerVaultDownload } from '../utils/vaultExporter';

export default function VaultExportModal({ currentPassword = '', currentAnalyzerPassword = '', onRestorePassword }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'

  // Export State
  const [masterPassphrase, setMasterPassphrase] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Import State
  const [importFile, setImportFile] = useState(null);
  const [importPackage, setImportPackage] = useState(null);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [restoredData, setRestoredData] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

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
      setMasterPassphrase('');
    } catch (err) {
      setExportError(err.message || "Failed to generate encrypted vault.");
    } finally {
      setIsExporting(false);
    }
  };

  const processSelectedFile = (file) => {
    setImportError(null);
    setRestoredData(null);
    setSuccessToast(null);

    if (!file.name.endsWith('.cgvault') && !file.name.endsWith('.json')) {
      setImportError("Please select a valid .cgvault or .json backup file.");
      return;
    }

    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.ciphertext || !parsed.salt || !parsed.iv) {
          throw new Error("Invalid backup format. Missing encryption metadata (salt, iv, ciphertext).");
        }
        setImportPackage(parsed);
      } catch (err) {
        setImportError(err.message || "Failed to parse backup file structure.");
        setImportPackage(null);
      }
    };
    reader.onerror = () => {
      setImportError("Error reading file from disk.");
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDecryptImport = async () => {
    if (!importPackage || !importPassphrase) {
      setImportError("Please enter the Master Passphrase used when creating this backup.");
      return;
    }

    setImportError(null);
    setIsDecrypting(true);

    try {
      const decrypted = await decryptEncryptedVault(importPackage, importPassphrase);
      setRestoredData(decrypted);
      setSuccessToast("Vault Restored Successfully!");

      try {
        localStorage.setItem('cipherguard_restored_vault', JSON.stringify(decrypted));
      } catch {
        // quota / restricted storage fallback
      }

      if (decrypted.credentials && decrypted.credentials.length > 0 && onRestorePassword) {
        onRestorePassword(decrypted.credentials[0].value);
      }
    } catch (err) {
      setImportError("Invalid Master Password or corrupted backup file.");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-4 w-full font-mono">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs text-[#849581]">
          <Lock className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-09: ENCRYPTED_VAULT_EXPORT_AND_IMPORT</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1 rounded bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30 text-xs font-bold hover:bg-[#00ff66]/20 transition-all flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            {isOpen ? "CLOSE_PANEL" : "OPEN_VAULT_TOOLS (AES-GCM)"}
          </button>
        </div>
      </div>

      {/* Mandatory UI Guidance Banner */}
      <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Encryption Guidance Notice:</strong> Backup files are encrypted with AES-256-GCM and cannot be opened directly in standard text readers. Use this Import tool to restore your vault.
        </span>
      </div>

      {/* Modal / Expanded Tool Drawer */}
      {isOpen && (
        <div className="flex flex-col gap-4 p-4 rounded-lg bg-[#050505] border border-[#2d382c] text-xs">
          {/* Tab Bar */}
          <div className="flex border-b border-[#2d382c]">
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`py-2 px-4 text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'export'
                  ? 'border-[#00ff66] text-[#00ff66] bg-[#00ff66]/10'
                  : 'border-transparent text-[#849581] hover:text-[#e3e1ec]'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>EXPORT ENCRYPTED VAULT</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`py-2 px-4 text-xs font-bold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'import'
                  ? 'border-[#00ff66] text-[#00ff66] bg-[#00ff66]/10'
                  : 'border-transparent text-[#849581] hover:text-[#e3e1ec]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>IMPORT &amp; DECRYPT VAULT</span>
            </button>
          </div>

          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Knowledge Export:</strong> Credentials are encrypted locally using <strong>AES-256-GCM + PBKDF2-HMAC-SHA256</strong> with 600,000 iterations.
                </span>
              </div>

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

              <div className="space-y-1.5 bg-[#08090d] p-3 rounded border border-[#1a241b]">
                <span className="text-[10px] text-[#849581] block">INCLUDED SESSION CREDENTIALS ({candidates.length})</span>
                {candidates.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] text-[#e3e1ec]">
                    <span className="text-[#849581]">{item.label}:</span>
                    <span className="font-mono">{item.value.slice(0, 8)}••••••••</span>
                  </div>
                ))}
              </div>

              {exportError && (
                <div className="text-red-400 text-xs flex items-center gap-1.5 p-2.5 rounded bg-red-950/80 border border-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

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

          {/* TAB 2: IMPORT & DECRYPT */}
          {activeTab === 'import' && (
            <div className="space-y-4 pt-2">
              {/* Drag and Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragOver
                    ? 'border-[#00ff66] bg-[#00ff66]/10'
                    : importFile
                    ? 'border-[#00ff66]/50 bg-[#08090d]'
                    : 'border-[#2d382c] bg-[#050505] hover:border-[#00ff66]/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".cgvault,.json"
                  data-testid="vault-file-input"
                  className="hidden"
                />

                {importFile ? (
                  <div className="flex items-center gap-2 text-[#00ff66]">
                    <FileCheck className="w-6 h-6 text-[#00ff66]" />
                    <span className="font-bold text-xs">{importFile.name}</span>
                    <span className="text-[10px] text-[#849581]">({(importFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <>
                    <FolderUp className="w-8 h-8 text-[#849581]" />
                    <div className="text-xs text-[#e3e1ec] font-semibold">
                      Drag &amp; Drop your <span className="text-[#00ff66]">.cgvault</span> or <span className="text-[#00ff66]">.json</span> file here
                    </div>
                    <span className="text-[10px] text-[#849581]">or click to browse local files</span>
                  </>
                )}
              </div>

              {/* Parsed Metadata Summary */}
              {importPackage && (
                <div className="bg-[#08090d] p-3 rounded border border-[#1a241b] space-y-1.5 text-[11px]">
                  <div className="text-[10px] text-[#849581] font-bold">DETECTED VAULT ENCRYPTION METADATA:</div>
                  <div className="flex justify-between text-[#849581]">
                    <span>ALGORITHM:</span>
                    <span className="text-[#00ff66]">{importPackage.algorithm || 'AES-GCM-256'}</span>
                  </div>
                  <div className="flex justify-between text-[#849581]">
                    <span>KDF FUNCTION:</span>
                    <span className="text-[#00ff66]">{importPackage.kdf || 'PBKDF2-HMAC-SHA256'}</span>
                  </div>
                  <div className="flex justify-between text-[#849581]">
                    <span>PBKDF2 ITERATIONS:</span>
                    <span className="text-[#00ff66]">{(importPackage.iterations || 600000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[#849581]">
                    <span>SALT (BASE64):</span>
                    <span className="font-mono text-[#e3e1ec]">{importPackage.salt?.slice(0, 16)}...</span>
                  </div>
                </div>
              )}

              {/* Passphrase Input */}
              {importPackage && (
                <div className="space-y-2">
                  <label className="block text-xs text-[#00ff66] font-semibold">
                    ENTER MASTER PASSPHRASE FOR DECRYPTION
                  </label>
                  <input
                    type="password"
                    value={importPassphrase}
                    onChange={(e) => setImportPassphrase(e.target.value)}
                    placeholder="Enter Master Password used for encryption..."
                    className="w-full terminal-input font-mono text-sm py-2.5 px-3 rounded-lg bg-[#08090d] border border-[#2d382c] focus:border-[#00ff66]"
                  />
                </div>
              )}

              {/* Error Message Feedback */}
              {importError && (
                <div className="text-red-400 text-xs flex items-center gap-1.5 p-2.5 rounded bg-red-950/80 border border-red-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Toast */}
              {successToast && (
                <div className="text-emerald-300 text-xs flex items-center gap-1.5 p-3 rounded bg-emerald-950/80 border border-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
                  <span>{successToast}</span>
                </div>
              )}

              {/* Decrypted Credentials Preview */}
              {restoredData && (
                <div className="space-y-2 bg-[#08090d] p-3 rounded border border-[#00ff66]/30">
                  <div className="text-[10px] text-[#00ff66] font-bold">DECRYPTED VAULT CONTENTS:</div>
                  {restoredData.credentials && restoredData.credentials.map((cred, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] p-2 rounded bg-[#050505] border border-[#2d382c]">
                      <div>
                        <span className="text-[#849581] block">{cred.label || `Credential #${idx+1}`}</span>
                        <span className="text-[#00ff66] font-bold tracking-wider">{cred.value}</span>
                      </div>
                      {onRestorePassword && (
                        <button
                          type="button"
                          onClick={() => onRestorePassword(cred.value)}
                          className="px-2 py-1 rounded bg-[#00ff66]/20 text-[#00ff66] hover:bg-[#00ff66]/30 border border-[#00ff66]/40 text-[10px]"
                        >
                          APPLY TO ANALYZER
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Decrypt Action Button */}
              {importPackage && !restoredData && (
                <button
                  type="button"
                  onClick={handleDecryptImport}
                  disabled={isDecrypting || !importPassphrase}
                  className="w-full py-2.5 rounded-lg bg-[#00ff66] text-[#050505] font-bold text-xs hover:bg-[#00ff66]/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDecrypting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Deriving Key &amp; Decrypting AES-256-GCM...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      DECRYPT &amp; RESTORE VAULT
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
