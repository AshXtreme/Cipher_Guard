import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import BackgroundCanvas from './components/BackgroundCanvas';
import LiveAnalyzerConsole from './components/LiveAnalyzerConsole';
import HeuristicsBreakdown from './components/HeuristicsBreakdown';
import TactileGenerator from './components/TactileGenerator';
import TelemetryLog from './components/TelemetryLog';
import ComparisonTray from './components/ComparisonTray';

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
      // 1. Analyze Strength via backend POST /api/analyze
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: candidate })
      });

      if (analyzeRes.ok) {
        const analyzeData = await analyzeRes.json();
        setAnalysis(analyzeData);
      }

      // 2. Compute local SHA-1 prefix for k-anonymity breach check
      const { prefix, suffix } = await computeSha1(candidate);
      appendLog(`QUERY HASH PREFIX [${prefix}]... (Plaintext & full hash retained in browser only)`);

      const breachRes = await fetch(`/api/breach-check?prefix=${prefix}`);
      if (breachRes.ok) {
        const breachData = await breachRes.json();
        appendLog(`FORWARDED 5-HEX PREFIX TO HIBP PROXY WITH Add-Padding: true`);

        const suffixes = breachData.suffixes || [];
        const match = suffixes.find(s => s.suffix === suffix);

        if (match) {
          setBreachInfo({ count: match.count, isBreached: true });
          appendLog(`⚠️ MATCH FOUND: Password appeared in ${match.count.toLocaleString()} known data breaches!`);
        } else {
          setBreachInfo({ count: 0, isBreached: false });
          appendLog(`✅ STATUS: CLEAN — 0 breach occurrences found for suffix.`);
        }
      } else {
        appendLog(`⚠️ Upstream breach check service unavailable.`);
        setBreachInfo(null);
      }

    } catch (err) {
      console.error("Evaluation error:", err);
      appendLog(`❌ ERROR: Network error while reaching security proxy.`);
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

        {/* Pane 5: Password Health Comparison Tool (MOD-05) */}
        <ComparisonTray currentAnalyzerPassword={password} />
      </main>

      {/* Footer Bar */}
      <footer className="border-t border-[#2d382c] bg-[#0c0d12]/90 backdrop-blur-md py-3 px-6 text-center text-xs text-[#849581] font-mono z-10">
        CipherGuard v1.2 — Password Security Analyzer, Generator &amp; Health Comparison Matrix
      </footer>
    </div>
  );
}
