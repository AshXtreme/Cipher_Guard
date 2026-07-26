import React, { useState, useEffect, useRef } from 'react';
import { Cpu, AlertTriangle, Clock, ShieldAlert, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { computeEducationalHashes } from '../utils/kdfLabUtil';

export default function KdfLab() {
  const [demoText, setDemoText] = useState('HelloCipherGuard2026');
  const [iterations, setIterations] = useState(600000);
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    // Initialize Web Worker for non-blocking off-main-thread computation
    try {
      workerRef.current = new Worker(
        new URL('../workers/kdfWorker.js', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (e) => {
        if (e.data.status === 'success') {
          setResults(e.data.results);
        }
        setIsCalculating(false);
      };

      workerRef.current.onerror = (err) => {
        console.warn("Web Worker notice, falling back to main-thread async:", err);
        setIsCalculating(false);
      };
    } catch (e) {
      console.warn("Web Worker not supported in current environment, using async fallback.");
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Compute hashes whenever demoText or iterations change
  useEffect(() => {
    if (!demoText) {
      setResults(null);
      setIsCalculating(false);
      return;
    }

    setIsCalculating(true);
    const id = Date.now();

    const timer = setTimeout(async () => {
      if (workerRef.current) {
        workerRef.current.postMessage({
          id,
          text: demoText,
          pbkdf2Iterations: iterations,
          bcryptRounds: 8
        });
      } else {
        // Fallback for environments without Worker support
        try {
          const fallbackRes = await computeEducationalHashes(demoText, iterations);
          setResults(fallbackRes);
        } catch (err) {
          console.error("KDF computation error:", err);
        } finally {
          setIsCalculating(false);
        }
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [demoText, iterations]);

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-5 w-full font-mono">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs text-[#849581]">
          <Cpu className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-07: CLIENT_SIDE_HASHING_AND_KDF_LAB</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1b22] text-[#00ff66] border border-[#00ff66]/30">
          CRYPTO_PLAYGROUND
        </span>
      </div>

      {/* Persistent Explicit Sandbox Disclaimer Banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/80 text-xs text-amber-300 leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>For demonstration only:</strong> Don't type a real password you use elsewhere — this is a sandbox to show how hashing works, not a strength check.
        </span>
      </div>

      {/* Target Sandbox Input Field */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-xs text-[#00ff66] tracking-wider font-semibold">
            TRY_ANY_TEXT_HERE (DEMO_INPUT)
          </label>
          {isCalculating && (
            <span className="flex items-center gap-1.5 text-xs text-[#00ff66] animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Computing KDFs in Web Worker...
            </span>
          )}
        </div>
        <input
          type="text"
          value={demoText}
          onChange={(e) => setDemoText(e.target.value)}
          placeholder="Type any sample text to see live hashing..."
          maxLength={128}
          className="w-full terminal-input font-mono text-base py-3 px-4 rounded-lg bg-[#08090d] border border-[#2d382c] focus:border-[#00ff66] transition-all"
        />
      </div>

      {/* Controls: PBKDF2 Iterations Slider */}
      <div className="bg-[#050505] p-3.5 rounded-lg border border-[#1a241b] flex flex-col gap-2 text-xs">
        <div className="flex justify-between items-center text-[#849581]">
          <span>PBKDF2_ITERATION_COUNT (OWASP Default: 600,000)</span>
          <span className="text-[#00ff66] font-bold">{iterations.toLocaleString()} ITERATIONS</span>
        </div>
        <input
          type="range"
          min={100000}
          max={600000}
          step={50000}
          value={iterations}
          onChange={(e) => setIterations(Number(e.target.value))}
          className="w-full accent-[#00ff66] bg-[#1a241b] cursor-pointer"
        />
      </div>

      {/* Live Hash & KDF Output Matrix */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Legacy / Unsafe Hashes Card */}
          <div className="bg-[#050505] border border-red-900/60 p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-red-900/40 pb-2">
              <span className="font-bold text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Legacy / Unsafe Hashes
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-semibold">
                NEVER USE FOR PASSWORDS
              </span>
            </div>

            {/* MD5 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#e3e1ec] font-bold">MD5</span>
                <span className="text-[#849581] font-mono">{results.md5?.timeMs} ms</span>
              </div>
              <div className="bg-[#0c0d12] p-2 rounded border border-[#1a241b] text-[11px] break-all font-mono text-red-300">
                {results.md5?.hash}
              </div>
            </div>

            {/* SHA-1 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#e3e1ec] font-bold">SHA-1</span>
                <span className="text-[#849581] font-mono">{results.sha1?.timeMs} ms</span>
              </div>
              <div className="bg-[#0c0d12] p-2 rounded border border-[#1a241b] text-[11px] break-all font-mono text-red-300">
                {results.sha1?.hash}
              </div>
            </div>

            <p className="text-[10px] text-[#849581] leading-relaxed pt-1">
              *Fast MD5/SHA-1 hashes allow attackers to compute billions of guesses/sec on cheap hardware.
            </p>
          </div>

          {/* Modern Fast Hashes Card */}
          <div className="bg-[#050505] border border-yellow-900/60 p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-yellow-900/40 pb-2">
              <span className="font-bold text-yellow-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-yellow-400" />
                Modern Fast Hashes
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-950 text-yellow-400 border border-yellow-800 font-semibold">
                FAST / NOT ALONE
              </span>
            </div>

            {/* SHA-256 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#e3e1ec] font-bold">SHA-256</span>
                <span className="text-[#849581] font-mono">{results.sha256?.timeMs} ms</span>
              </div>
              <div className="bg-[#0c0d12] p-2 rounded border border-[#1a241b] text-[11px] break-all font-mono text-yellow-200">
                {results.sha256?.hash}
              </div>
            </div>

            {/* SHA-512 */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#e3e1ec] font-bold">SHA-512</span>
                <span className="text-[#849581] font-mono">{results.sha512?.timeMs} ms</span>
              </div>
              <div className="bg-[#0c0d12] p-2 rounded border border-[#1a241b] text-[11px] break-all font-mono text-yellow-200">
                {results.sha512?.hash}
              </div>
            </div>

            <p className="text-[10px] text-[#849581] leading-relaxed pt-1">
              *SHA-256/512 are cryptographically secure for data integrity, but too fast for password storage without a KDF.
            </p>
          </div>

          {/* Key Derivation Functions (KDFs) Card */}
          <div className="md:col-span-2 bg-[#050505] border border-emerald-900/60 p-4 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
              <span className="font-bold text-[#00ff66] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
                Key Derivation Functions (KDFs)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-[#00ff66] border border-emerald-800 font-semibold">
                SUITABLE FOR PASSWORDS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* PBKDF2 */}
              <div className="space-y-1 bg-[#0c0d12] p-3 rounded border border-[#1a241b]">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#e3e1ec] font-bold">PBKDF2-HMAC-SHA256</span>
                  <span className="text-[#00ff66] font-mono font-bold">{results.pbkdf2?.timeMs} ms</span>
                </div>
                <span className="text-[9px] text-[#849581] block">Iterations: {results.pbkdf2?.iterations?.toLocaleString()}</span>
                <div className="text-[10px] break-all font-mono text-[#00ff66]/90 mt-1">
                  {results.pbkdf2?.hash}
                </div>
              </div>

              {/* bcrypt */}
              {results.bcrypt && (
                <div className="space-y-1 bg-[#0c0d12] p-3 rounded border border-[#1a241b]">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#e3e1ec] font-bold">bcrypt</span>
                    <span className="text-[#00ff66] font-mono font-bold">{results.bcrypt?.timeMs} ms</span>
                  </div>
                  <span className="text-[9px] text-[#849581] block">Rounds: {results.bcrypt?.rounds}</span>
                  <div className="text-[10px] break-all font-mono text-[#00ff66]/90 mt-1">
                    {results.bcrypt?.hash}
                  </div>
                </div>
              )}

              {/* Argon2id */}
              {results.argon2 && (
                <div className="space-y-1 bg-[#0c0d12] p-3 rounded border border-[#1a241b]">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#e3e1ec] font-bold">Argon2id</span>
                    <span className="text-[#00ff66] font-mono font-bold">{results.argon2?.timeMs} ms</span>
                  </div>
                  <span className="text-[9px] text-[#849581] block">Memory-Hard KDF</span>
                  <div className="text-[10px] break-all font-mono text-[#00ff66]/90 mt-1">
                    {results.argon2?.hash}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-[#849581] leading-relaxed pt-1">
              *KDFs deliberately add configurable work &amp; memory costs to slow down brute-force hardware by orders of magnitude.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
