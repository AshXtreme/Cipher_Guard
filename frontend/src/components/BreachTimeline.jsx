import React, { useState, useMemo } from 'react';
import { History, Search, ExternalLink, ShieldAlert, Filter, AlertCircle } from 'lucide-react';
import breachTimelineData from '../data/breach-timeline.json';

export default function BreachTimeline() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlgo, setSelectedAlgo] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NEWEST');

  // Filter and sort the static offline dataset
  const filteredEntries = useMemo(() => {
    return breachTimelineData
      .filter((entry) => {
        // Search term matching
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          entry.name.toLowerCase().includes(q) ||
          entry.hashMethodReported.toLowerCase().includes(q) ||
          entry.significanceNote.toLowerCase().includes(q) ||
          entry.approximateYear.toString().includes(q);

        // Algorithm category filter
        let matchesAlgo = true;
        if (selectedAlgo === 'PLAINTEXT') {
          matchesAlgo = entry.hashMethodReported.toLowerCase().includes('plaintext');
        } else if (selectedAlgo === 'MD5') {
          matchesAlgo = entry.hashMethodReported.toLowerCase().includes('md5');
        } else if (selectedAlgo === 'SHA1') {
          matchesAlgo = entry.hashMethodReported.toLowerCase().includes('sha-1');
        } else if (selectedAlgo === 'KDF') {
          matchesAlgo =
            entry.hashMethodReported.toLowerCase().includes('bcrypt') ||
            entry.hashMethodReported.toLowerCase().includes('pbkdf2') ||
            entry.hashMethodReported.toLowerCase().includes('sha-256');
        }

        return matchesSearch && matchesAlgo;
      })
      .sort((a, b) => {
        if (sortOrder === 'NEWEST') {
          return b.approximateYear - a.approximateYear;
        } else if (sortOrder === 'OLDEST') {
          return a.approximateYear - b.approximateYear;
        }
        return 0;
      });
  }, [searchTerm, selectedAlgo, sortOrder]);

  return (
    <div className="industrial-panel p-5 md:p-6 rounded-xl flex flex-col gap-5 w-full font-mono text-xs select-none">
      {/* Header Bar */}
      <div className="flex justify-between items-center border-b border-[#2d382c] pb-3">
        <div className="flex items-center gap-2 text-xs text-[#849581]">
          <History className="w-4 h-4 text-[#00ff66]" />
          <span className="font-bold text-[#00ff66]">MOD-10: BREACH_EXPOSURE_TIMELINE</span>
        </div>
        <span className="text-[10px] text-[#849581] hidden sm:inline">
          HISTORICAL_REFERENCE_DATASET ({filteredEntries.length} INCIDENTS)
        </span>
      </div>

      {/* Mandatory Disclaimer Copy */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/30 border border-amber-800/60 text-amber-300 leading-relaxed text-[11px]">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Educational Reference Disclaimer:</strong> Figures are drawn from public reporting and may vary by source; this is an educational reference, not a real-time or authoritative breach registry.
        </span>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#050505] p-3 rounded-lg border border-[#2d382c]">
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search breach or hash algorithm..."
            className="w-full terminal-input font-mono text-xs py-2 pl-8 pr-3 rounded bg-[#08090d] border border-[#2d382c] focus:border-[#00ff66]"
          />
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#849581]" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <div className="flex items-center gap-1 text-[#849581] text-[10px]">
            <Filter className="w-3 h-3" />
            <span>HASH_TYPE:</span>
          </div>
          {['ALL', 'PLAINTEXT', 'MD5', 'SHA1', 'KDF'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedAlgo(cat)}
              className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                selectedAlgo === cat
                  ? 'bg-[#00ff66]/20 border-[#00ff66] text-[#00ff66]'
                  : 'bg-[#08090d] border-[#1a241b] text-[#849581] hover:text-[#e3e1ec]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-1.5 text-[10px] text-[#849581]">
          <span>SORT:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-[#08090d] border border-[#2d382c] text-[#00ff66] text-[10px] font-mono py-1 px-2 rounded focus:outline-none"
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {filteredEntries.length === 0 ? (
          <div className="col-span-full py-8 text-center text-[#849581]">
            No historical breaches found matching filters.
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-[#050505] p-4 rounded-lg border border-[#2d382c] hover:border-[#00ff66]/50 transition-all flex flex-col justify-between gap-3 relative group"
            >
              <div>
                <div className="flex justify-between items-start border-b border-[#1a241b] pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30 font-bold text-[11px]">
                      {entry.approximateYear}
                    </span>
                    <h4 className="font-bold text-sm text-[#e3e1ec] tracking-wide">{entry.name}</h4>
                  </div>
                  <span className="text-[10px] text-red-400 bg-red-950/60 border border-red-800 px-2 py-0.5 rounded font-mono font-semibold">
                    {entry.accountsAffected} Accounts
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#849581]">
                    <span className="text-amber-400 font-semibold">Reported Hashing:</span>
                    <span className="text-[#e3e1ec] font-mono">{entry.hashMethodReported}</span>
                  </div>
                  <p className="text-[#849581] leading-relaxed text-[11px] pt-1">
                    {entry.significanceNote}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1a241b] flex justify-between items-center text-[10px]">
                <span className="text-[#849581] flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  Historical Incident Record
                </span>
                <a
                  href={entry.publicSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00ff66] hover:underline flex items-center gap-1 font-semibold"
                >
                  Public Source
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
