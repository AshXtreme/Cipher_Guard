import React, { useEffect, useRef } from 'react';
import { Terminal, Activity, Wifi } from 'lucide-react';

export default function TelemetryLog({ logs }) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#849581]">
          <Terminal className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-04: HIBP_TELEMETRY_LOG</span>
        </div>
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-[#00ff66] animate-pulse" />
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30">
            HTTPS_TUNNEL
          </span>
        </div>
      </div>

      {/* Monospaced Terminal Output Box */}
      <div className="bg-[#050505] border border-[#2d382c] p-3 rounded-lg flex-1 min-h-[160px] max-h-[260px] relative overflow-hidden flex flex-col">
        <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#1a241b] text-[10px] font-mono text-[#849581]">
          <span>TELEMETRY_STREAM</span>
          <span className="text-[#00ff66]">Add-Padding: true</span>
        </div>

        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto terminal-scroll font-mono text-xs text-[#00ff66] space-y-1.5 leading-relaxed pr-1"
        >
          {logs && logs.length > 0 ? (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-[#849581] select-none">&gt;</span>
                <span className={log.includes("COMPROMISED") || log.includes("WARNING") ? "text-red-400 font-bold" : ""}>
                  {log}
                </span>
              </div>
            ))
          ) : (
            <div className="text-[#849581] italic">
              &gt; INITIALIZING HIBP K-ANONYMITY PROXY...
              <br />
              &gt; TYPE A PASSWORD IN CONSOLE TO TRIGGER 5-HEX PREFIX QUERY.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
