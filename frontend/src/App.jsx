import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import BackgroundCanvas from './components/BackgroundCanvas';
import LiveAnalyzerConsole from './components/LiveAnalyzerConsole';
import HeuristicsBreakdown from './components/HeuristicsBreakdown';
import TactileGenerator from './components/TactileGenerator';
import TelemetryLog from './components/TelemetryLog';
import ComparisonTray from './components/ComparisonTray';
import CrackTimeSimulator from './components/CrackTimeSimulator';
import TypoStressTest from './components/TypoStressTest';
import KdfLab from './components/KdfLab';
import VaultExportModal from './components/VaultExportModal';
import BreachTimeline from './components/BreachTimeline';
import TotpGenerator from './components/TotpGenerator';
import AuditDashboard from './components/AuditDashboard';
import { analyzePasswordLocally } from './utils/analyzer';
import { checkBloomFilter } from './utils/bloomFilter';

// Helper function to compute SHA-1 hash prefix and suffix in browser
async function computeSha1(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return {
    fullHash: hashHex,
    prefix: hashHex.slice(0, 5),
    suffix: hashHex.slice(5)
  };
}

export default function App() {
  const [password, setPassword] = useState('xQ7$mPz2!vT9@wLk');
  const [analysis, setAnalysis] = useState(null);
  const [breachInfo, setBreachInfo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Compute active bit entropy for CrackTimeSimulator
  const currentEntropy = useMemo(() => {
    if (!password) return 0;
    let hasLower = /[a-z]/.test(password);
    let hasUpper = /[A-Z]/.test(password);
    let hasDigit = /[0-9]/.test(password);
    let hasSymbol = /[^a-zA-Z0-9]/.test(password);
    let poolSize = (hasLower ? 26 : 0) + (hasUpper ? 26 : 0) + (hasDigit ? 10 : 0) + (hasSymbol ? 32 : 0);
    if (poolSize === 0) poolSize = 26;
    return Math.round(password.length * Math.log2(poolSize) * 100) / 100;
  }, [password]);

  const appendLog = (msg) => {
    setLogs(prev => [...prev.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const evaluatePassword = useCallback(async (candidate) => {
    if (!candidate) {
      setAnalysis(null);
      setBreachInfo(null);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Analyze Strength 100% client-side in browser memory
      const analyzeData = analyzePasswordLocally(candidate);
      setAnalysis(analyzeData);

      // 2. Compute local SHA-1 prefix & query client-side Bloom Filter dataset
      const { prefix } = await computeSha1(candidate);
      appendLog(`LOCAL HASH PREFIX [${prefix}] (0-network client memory)`);

      const isBreached = checkBloomFilter(candidate);
      if (isBreached) {
        setBreachInfo({ count: 1, isBreached: true });
        appendLog(`⚠️ MATCH FOUND: Password matches a known breached pattern in local Bloom Filter.`);
      } else {
        setBreachInfo({ count: 0, isBreached: false });
        appendLog(`✅ STATUS: CLEAN — 0 breach occurrences in local Bloom Filter dataset.`);
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      appendLog(`❌ ERROR: Evaluation failed in client memory.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced evaluation on password change
  useEffect(() => {
    const timer = setTimeout(() => {
      evaluatePassword(password);
    }, 250);
    return () => clearTimeout(timer);
  }, [password, evaluatePassword]);

  return (
    <div className="min-h-screen bg-[#050505] text-[#e3e1ec] font-mono relative flex flex-col selection:bg-[#00ff66]/30">
      {/* WebGL Animated Background */}
      <BackgroundCanvas />

      {/* Header / Navbar */}
      <Header />

      {/* Main Workspace Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto pt-20 pb-12 px-4 sm:px-6 lg:px-8 z-10 relative flex flex-col gap-6">
        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Pane 1: Live Analyzer Console (7 cols) */}
          <div className="lg:col-span-7">
            <LiveAnalyzerConsole
              password={password}
              setPassword={setPassword}
              analysis={analysis}
              breachInfo={breachInfo}
              isLoading={isLoading}
            />
          </div>

          {/* Pane 2: Heuristics Breakdown (5 cols) */}
          <div className="lg:col-span-5">
            <HeuristicsBreakdown
              checks={analysis?.checks}
              suggestions={analysis?.suggestions}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Pane 3: Tactile Generator Rack (7 cols) */}
          <div className="lg:col-span-7">
            <TactileGenerator
              onGenerateToAnalyzer={(newPwd) => setPassword(newPwd)}
            />
          </div>

          {/* Pane 4: HIBP Telemetry Log (5 cols) */}
          <div className="lg:col-span-5">
            <TelemetryLog logs={logs} />
          </div>
        </div>

        {/* Pane 6: Time-to-Crack Offline Simulator (MOD-06) */}
        <CrackTimeSimulator entropyBits={currentEntropy} />

        {/* Pane 8: Typo-Squatting / Fat-Finger Stress Test (MOD-08) */}
        <TypoStressTest password={password} />

        {/* Pane 7: Client-Side Hashing & KDF Lab (MOD-07) */}
        <KdfLab />

        {/* Pane 9: Encrypted Vault Export (MOD-09) */}
        <VaultExportModal currentPassword={password} />

        {/* Pane 10: Breach-Leak Exposure Timeline (MOD-10) */}
        <BreachTimeline />

        {/* Pane 11: Offline TOTP / 2FA QR Generator Sandbox (MOD-11) */}
        <TotpGenerator />

        {/* Pane 12: Interactive Password Audit Dashboard (MOD-12) */}
        <AuditDashboard />

        {/* Pane 5: Password Health Comparison Tool (MOD-05) */}
        <ComparisonTray currentAnalyzerPassword={password} />
      </main>

      {/* Footer Bar */}
      <footer className="border-t border-[#2d382c] bg-[#0c0d12]/90 backdrop-blur-md py-3 px-6 text-center text-xs text-[#849581] font-mono z-10">
        CipherGuard v1.7 — Password Security Analyzer, KDF Playground, 2FA Sandbox &amp; In-Browser Password Audit Dashboard
      </footer>
    </div>
  );
}
