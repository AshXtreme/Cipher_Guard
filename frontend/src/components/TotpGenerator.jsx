import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, RefreshCw, Copy, Check, Clock, AlertCircle, KeyRound, QrCode } from 'lucide-react';
import { useClipboardTimer } from '../hooks/useClipboardTimer';
import {
  generateCsprngBase32Secret,
  computeTotpToken,
  getRemainingSeconds,
  buildOtpauthUri
} from '../utils/totpUtils';

export default function TotpGenerator() {
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('------');
  const [remainingSec, setRemainingSec] = useState(30);

  const { copied, copyToClipboard } = useClipboardTimer();

  // Regenerate fresh CSPRNG secret & purge previous secret from state
  const handleRegenerate = useCallback(() => {
    const newSecret = generateCsprngBase32Secret(20);
    setSecret(newSecret);
  }, []);

  // Initialize secret on mount
  useEffect(() => {
    handleRegenerate();
  }, [handleRegenerate]);

  // Recalculate TOTP token and countdown every second
  useEffect(() => {
    if (!secret) return;

    const updateTotp = () => {
      const now = Date.now();
      const currentToken = computeTotpToken(secret, now);
      const remaining = getRemainingSeconds(now);
      setToken(currentToken);
      setRemainingSec(remaining);
    };

    updateTotp();
    const interval = setInterval(updateTotp, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  const otpauthUri = secret ? buildOtpauthUri(secret, 'demo', 'CipherGuard') : '';

  const formattedToken = token.length === 6 ? `${token.slice(0, 3)} ${token.slice(3)}` : token;

  const handleCopySecret = () => {
    if (secret) {
      copyToClipboard(secret, 30);
    }
  };

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-5 w-full font-mono text-xs select-none">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs text-[#849581]">
          <ShieldCheck className="w-4 h-4 text-[#00ff66]" />
          <span className="font-bold text-[#00ff66]">MOD-11: OFFLINE_2FA_TOTP_SANDBOX</span>
        </div>
        <span className="text-[10px] text-[#849581] hidden sm:inline px-2 py-0.5 rounded bg-[#1a1b22] text-[#00ff66] border border-[#00ff66]/30">
          CSPRNG_RFC6238_OFFLINE
        </span>
      </div>

      {/* Mandatory Sandbox & Practice Tool Disclaimer (Section 2.1) */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-amber-300 leading-relaxed text-[11px]">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Educational Sandbox Disclaimer:</strong> This is a standalone practice/demo tool for testing scan-and-verify 2FA flows with authenticator apps (Google Authenticator, Authy, Ente Auth). Generating a secret here does <em>NOT</em> add 2FA to any real external account.
        </span>
      </div>

      {/* Main Grid: QR Code + Secret & Token Display */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-[#050505] p-5 rounded-lg border border-[#2d382c]">
        {/* Left Column: Scannable QR Code */}
        <div className="md:col-span-5 flex flex-col items-center justify-center gap-3 p-4 bg-[#08090d] rounded-lg border border-[#1a241b]">
          <div className="p-3 bg-white rounded-lg shadow-lg border border-gray-300 flex items-center justify-center">
            {otpauthUri ? (
              <QRCodeSVG
                value={otpauthUri}
                size={160}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="M"
              />
            ) : (
              <div className="w-[160px] h-[160px] flex items-center justify-center text-gray-500 text-xs">
                Generating QR...
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#849581] text-center">
            <QrCode className="w-3.5 h-3.5 text-[#00ff66]" />
            <span>Scan with Google Authenticator / Authy</span>
          </div>
        </div>

        {/* Right Column: Secret, Token & Countdown */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Live 6-Digit TOTP Token */}
          <div className="bg-[#08090d] p-4 rounded-lg border border-[#1a241b] flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] text-[#849581]">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[#00ff66]" />
                LIVE_6_DIGIT_TOTP_CODE
              </span>
              <span className="flex items-center gap-1 text-[#00ff66] font-bold">
                <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                {remainingSec}s REMAINING
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-2xl md:text-3xl font-bold tracking-widest text-[#00ff66] text-glow py-1">
                {formattedToken}
              </div>
              <button
                onClick={handleRegenerate}
                className="p-2.5 rounded-lg bg-[#00ff66]/10 hover:bg-[#00ff66]/20 border border-[#00ff66]/30 text-[#00ff66] transition-all flex items-center gap-1.5 text-xs"
                title="Purge old secret and generate a fresh one"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Regenerate</span>
              </button>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full bg-[#1a241b] h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full transition-all duration-1000 ease-linear ${
                  remainingSec <= 5 ? 'bg-red-500' : remainingSec <= 10 ? 'bg-amber-400' : 'bg-[#00ff66]'
                }`}
                style={{ width: `${(remainingSec / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Raw Base32 Secret */}
          <div className="bg-[#08090d] p-3 rounded-lg border border-[#1a241b] flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] text-[#849581]">
              <span>RAW_BASE32_SECRET (CSPRNG 160-BIT)</span>
              <span>RFC 4226 / 6238</span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-[#050505] p-2 rounded border border-[#2d382c]">
              <span className="font-mono text-xs text-[#e3e1ec] tracking-wider select-all overflow-x-auto">
                {secret || 'GENERATING...'}
              </span>
              <button
                onClick={handleCopySecret}
                className="p-1.5 rounded bg-[#1a1b22] hover:bg-[#252630] border border-[#2d382c] text-[#00ff66] transition-all shrink-0"
                title="Copy Base32 secret"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Mandatory Secret Privacy Warning (Section 2.3) */}
          <div className="text-[10px] text-[#849581] leading-relaxed flex items-start gap-1.5 pt-1">
            <AlertCircle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
            <span>
              <strong>Confidentiality Warning:</strong> The QR code and Base32 secret represent the raw 2FA key. Treat them with the same confidentiality as a password — do not screenshot or share.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
