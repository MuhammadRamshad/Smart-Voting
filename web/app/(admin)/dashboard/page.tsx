'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Vote,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Info,
} from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import io from 'socket.io-client';

interface Stats {
  totalVotes: number;
  flaggedCount: number;
  pendingSyncCount: number;
  activeElectionsCount: number;
  candidateVoteCounts: Array<{ candidateId: number; name: string; count: number }>;
  recentFlags: Array<{
    attemptId: string;
    riskScore: number;
    reasonCodes: string[];
    createdAt: string;
    reviewStatus: string;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalVotes: 0,
    flaggedCount: 0,
    pendingSyncCount: 0,
    activeElectionsCount: 1,
    candidateVoteCounts: [],
    recentFlags: [],
  });

  const [liveEvents, setLiveEvents] = useState<
    Array<{ type: 'cast' | 'flagged'; message: string; timestamp: number; txHash?: string }>
  >([]);

  const [socketConnected, setSocketConnected] = useState(false);

  const fetchStats = async () => {
    try {
      const resp = await fetch('/api/admin/stats');
      if (resp.ok) {
        const data = await resp.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching admin stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 12000);

    // Socket.io connection for real-time live events
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join:election', '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1');
    });

    socket.on('vote:cast', (data: any) => {
      setLiveEvents((prev) => [
        {
          type: 'cast',
          message: `Candidate #${data.candidateId} received vote`,
          timestamp: data.timestamp || Math.floor(Date.now() / 1000),
          txHash: data.txHash,
        },
        ...prev.slice(0, 19),
      ]);
      fetchStats();
    });

    socket.on('vote:flagged', (data: any) => {
      setLiveEvents((prev) => [
        {
          type: 'flagged',
          message: `Attempt flagged (Risk: ${data.riskScore?.toFixed(2)}): ${data.reasonCodes?.join(', ')}`,
          timestamp: Math.floor(Date.now() / 1000),
        },
        ...prev.slice(0, 19),
      ]);
      fetchStats();
    });

    socket.on('disconnect', () => setSocketConnected(false));

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            Real-Time Election Monitoring Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Canonical state sourced from smart contract events and AI behavioral scoring
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <Radio className={`w-3.5 h-3.5 ${socketConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className={socketConnected ? 'text-emerald-300' : 'text-slate-400'}>
              {socketConnected ? 'Live Feed Active' : 'Polling (Fallback)'}
            </span>
          </div>

          <button
            onClick={fetchStats}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scope Disclaimer Alert */}
      <div className="flex items-start gap-3 p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong>Demonstrator Notice:</strong> This prototype surfaces behavioral anomalies via an Isolation Forest trained on synthetic scenarios. Anomaly scores flag attempts for human inspection and <em>never</em> trigger automatic disenfranchisement.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total On-Chain Votes</span>
            <Vote className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono">
            {stats.totalVotes}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified by Ballot.sol
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Flagged for Review</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {stats.flaggedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pending official verification</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Offline Sync Queue</span>
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-indigo-300 font-mono">
            {stats.pendingSyncCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Local Dexie.js buffer items</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Elections</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            {stats.activeElectionsCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Contract state: Open</p>
        </div>
      </div>

      {/* Main Grid: Candidate Standings & Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate breakdown (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Vote className="w-4 h-4 text-neutral-400" /> Candidate Tally (On-Chain)
          </h2>

          <div className="space-y-3 pt-1">
            {stats.candidateVoteCounts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No votes recorded on-chain yet</p>
            ) : (
              stats.candidateVoteCounts.map((cand) => {
                const total = Math.max(stats.totalVotes, 1);
                const pct = Math.round((cand.count / total) * 100);
                return (
                  <div key={cand.candidateId} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-200">{cand.name}</span>
                      <span className="text-slate-400 font-mono">
                        {cand.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Feed & Recent Flags (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" /> Live Blockchain & AI Anomaly Stream
            </h2>
            <Link
              href="/admin/audit"
              className="text-xs text-neutral-400 hover:text-neutral-300 flex items-center gap-1"
            >
              Full Explorer <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto pr-2">
            {liveEvents.length === 0 ? (
              stats.recentFlags.length > 0 ? (
                stats.recentFlags.map((flag) => (
                  <div key={flag.attemptId} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <RiskBadge score={flag.riskScore} />
                        <span className="text-slate-300 font-mono text-[11px]">
                          {flag.reasonCodes.join(', ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {new Date(flag.createdAt).toLocaleTimeString()} — Status: {flag.reviewStatus}
                      </p>
                    </div>
                    <Link
                      href="/admin/flagged"
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] transition"
                    >
                      Review
                    </Link>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Awaiting transactions... As votes are submitted, verified blocks and AI anomaly scores will stream here in real-time.
                </div>
              )
            ) : (
              liveEvents.map((evt, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        evt.type === 'flagged' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                    <span className="text-slate-200">{evt.message}</span>
                  </div>
                  {evt.txHash && (
                    <span className="font-mono text-[11px] text-neutral-400">
                      {evt.txHash.slice(0, 8)}...
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
