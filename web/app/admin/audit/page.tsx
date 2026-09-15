'use client';

import React, { useEffect, useState } from 'react';
import { Search, ExternalLink, Copy, Check, ShieldCheck, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuditEvent {
  txHash: string;
  blockNumber: number;
  electionId: string;
  candidateId: number;
  maskedCommitment: string;
  timestamp: number;
}

export default function BlockchainAuditTrailPage() {
  const [electionId, setElectionId] = useState(
    '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1'
  );
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchAudit = async () => {
    if (!electionId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/audit/${electionId}?page=${page}&limit=20`);
      if (resp.ok) {
        const data = await resp.json();
        setEvents(data.events || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Audit query error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [electionId, page]);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    toast.success('Copied transaction hash');
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportCsv = () => {
    if (events.length === 0) {
      toast.error('No events to export');
      return;
    }

    const headers = ['BlockNumber', 'TxHash', 'CandidateId', 'MaskedCommitment', 'Timestamp'];
    const rows = events.map((e) => [
      e.blockNumber,
      e.txHash,
      e.candidateId,
      e.maskedCommitment,
      new Date(e.timestamp * 1000).toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `election_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" /> Decentralized Audit Trail Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Query immutable VoteCast events on-chain. Voter commitments are privacy-masked.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs text-slate-300 transition"
        >
          <Download className="w-3.5 h-3.5" /> Export Audit CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <input
          type="text"
          value={electionId}
          onChange={(e) => setElectionId(e.target.value)}
          placeholder="Filter by Election ID (bytes32 hex)..."
          className="flex-1 bg-transparent border-none text-xs text-slate-200 focus:outline-none font-mono"
        />
        <button
          onClick={fetchAudit}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Query'}
        </button>
      </div>

      {/* Explorer Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Block #</th>
                <th className="px-4 py-3.5">Transaction Hash</th>
                <th className="px-4 py-3.5">Candidate ID</th>
                <th className="px-4 py-3.5">Voter Commitment (Masked)</th>
                <th className="px-4 py-3.5">Mined Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No on-chain events found for this election.
                  </td>
                </tr>
              ) : (
                events.map((evt, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-blue-400">#{evt.blockNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-300">
                          {evt.txHash.slice(0, 10)}...{evt.txHash.slice(-8)}
                        </span>
                        <button
                          onClick={() => handleCopy(evt.txHash)}
                          className="p-1 hover:text-white text-slate-500 transition"
                        >
                          {copiedHash === evt.txHash ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-200">
                      Candidate #{evt.candidateId}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {evt.maskedCommitment}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(evt.timestamp * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
