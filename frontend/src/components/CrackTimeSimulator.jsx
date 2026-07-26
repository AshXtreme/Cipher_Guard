import React, { useMemo } from 'react';
import { Clock, Shield, Globe, Cpu, Zap, AlertCircle } from 'lucide-react';
import { estimateCrackTimes } from '../utils/crackTimeEstimator';

export default function CrackTimeSimulator({ entropyBits = 0 }) {
  const estimates = useMemo(() => {
    return estimateCrackTimes(entropyBits);
  }, [entropyBits]);

  const scenarios = [
    {
      title: 'Online, Throttled',
      rate: '100 guesses/sec',
      desc: 'Typical rate-limited web login form',
      time: estimates.onlineThrottled,
      icon: Globe,
      color: 'text-[#00ff66]',
      border: 'border-[#2d382c]'
    },
    {
      title: 'Online, Unthrottled',
      rate: '10,000 guesses/sec',
      desc: 'Unthrottled API without rate limiting',
      time: estimates.onlineUnthrottled,
      icon: Zap,
      color: 'text-yellow-400',
      border: 'border-[#2d382c]'
    },
    {
      title: 'Offline, Slow Hash',
      rate: '10^4 hashes/sec',
      desc: 'Bcrypt / Argon2 memory-hardened KDF',
      time: estimates.offlineSlow,
      icon: Shield,
      color: 'text-[#00ff66]',
      border: 'border-[#2d382c]'
    },
    {
      title: 'Offline, Fast Hash',
      rate: '10^11 hashes/sec',
      desc: 'SHA-1 / MD5 multi-GPU cracking rig',
      time: estimates.offlineFast,
      icon: Cpu,
      color: 'text-orange-400',
      border: 'border-[#2d382c]'
    }
  ];

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-4 w-full font-mono">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs text-[#849581]">
          <Clock className="w-4 h-4 text-[#00ff66]" />
          <span>MOD-06: TIME_TO_CRACK_OFFLINE_SIMULATOR</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1b22] text-[#00ff66] border border-[#00ff66]/30">
          THEORETICAL_BRUTEFORCE
        </span>
      </div>

      {/* 4 Scenario Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {scenarios.map((sc, idx) => {
          const IconComp = sc.icon;
          return (
            <div
              key={idx}
              className={`bg-[#050505] border ${sc.border} p-3.5 rounded-lg flex flex-col justify-between gap-2.5 hover:border-[#00ff66]/40 transition-all`}
            >
              <div className="flex items-center justify-between border-b border-[#1a241b] pb-2">
                <div className="flex items-center gap-1.5 text-[11px] text-[#e3e1ec] font-bold">
                  <IconComp className={`w-3.5 h-3.5 ${sc.color}`} />
                  <span>{sc.title}</span>
                </div>
                <span className="text-[9px] text-[#849581]">{sc.rate}</span>
              </div>

              <div className="my-1">
                <span className="text-[10px] text-[#849581] block">ESTIMATED TIME TO CRACK</span>
                <span className={`text-sm font-bold leading-tight block ${sc.color}`}>
                  {sc.time}
                </span>
              </div>

              <span className="text-[10px] text-[#849581] leading-tight">
                {sc.desc}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mandatory Explicit Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#050505] border border-[#2d382c] text-[11px] text-[#849581] leading-relaxed">
        <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <span>
          <strong>Disclaimer:</strong> These estimates assume a theoretical brute-force search across the full search space. Real-world attack speed depends on whether the password matches known dictionary words or patterns and how securely the target service hashes stored credentials.
        </span>
      </div>
    </div>
  );
}
