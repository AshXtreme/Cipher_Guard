import React from 'react';
import { ShieldCheck, Terminal, Cpu, Github, ExternalLink } from 'lucide-react';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0c0d12]/90 backdrop-blur-md border-b border-[#2d382c] px-4 md:px-8 flex items-center justify-between">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#00ff66]/10 border border-[#00ff66]/40 flex items-center justify-center text-[#00ff66] glow-accent">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-lg tracking-tight text-[#00ff66] text-glow flex items-center gap-2">
            CIPHER_GUARD
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#00ff66]/20 text-[#00ff66] border border-[#00ff66]/30">
              PROD-v1.0
            </span>
          </div>
          <p className="text-[11px] text-[#849581] font-mono tracking-wider hidden sm:block">
            SECURITY ANALYZER &amp; K-ANONYMITY PROXY
          </p>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#050505] border border-[#2d382c] text-[12px] font-mono text-[#00ff66]">
          <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse glow-accent" />
          <span>k-Anonymity Active</span>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#050505] border border-[#2d382c] text-[12px] font-mono text-[#e3e1ec]">
          <Cpu className="w-3.5 h-3.5 text-[#00ff66]" />
          <span>Zero-Knowledge Proxy</span>
        </div>

        <a
          href="https://github.com/AshXtreme/Cipher_Guard"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1b22] hover:bg-[#252630] border border-[#2d382c] text-[12px] font-mono text-[#e3e1ec] transition-colors"
        >
          <Github className="w-4 h-4 text-[#00ff66]" />
          <span className="hidden sm:inline">GitHub</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </header>
  );
}
