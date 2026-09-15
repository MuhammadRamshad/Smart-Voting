'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Vote,
  AlertTriangle,
  Radio,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Server,
  Activity,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
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

interface NodeFlow {
  id: string;
  account: string;
  role: string;
  balance: string;
  status: 'online' | 'active';
  lastBlock?: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalVotes: 0,
    flaggedCount: 0,
    pendingSyncCount: 0,
    activeElectionsCount: 1,
    candidateVoteCounts: [
      { candidateId: 1, name: 'Aromal', count: 0 },
      { candidateId: 2, name: 'Irshad', count: 0 },
      { candidateId: 3, name: 'Manikandan', count: 0 }
    ],
    recentFlags: [],
  });

  const [liveEvents, setLiveEvents] = useState<
    Array<{ type: 'cast' | 'flagged'; message: string; timestamp: number; txHash?: string }>
  >([]);

  const [socketConnected, setSocketConnected] = useState(false);

  // Blockchain account nodes
  const [nodes, setNodes] = useState<NodeFlow[]>([
    {
      id: 'Node-0',
      account: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      role: 'Relayer / Master Node',
      balance: '9999.8 ETH',
      status: 'active'
    },
    {
      id: 'Node-1',
      account: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      role: 'Validation Node #1',
      balance: '10000.0 ETH',
      status: 'online'
    },
    {
      id: 'Node-2',
      account: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      role: 'Validation Node #2',
      balance: '10000.0 ETH',
      status: 'online'
    },
    {
      id: 'Node-3',
      account: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      role: 'Audit Observer Node',
      balance: '10000.0 ETH',
      status: 'online'
    }
  ]);

  const fetchStats = async () => {
    try {
      const resp = await fetch('/api/admin/stats');
      if (resp.ok) {
        const data = await resp.json();
        if (data.candidateVoteCounts && data.candidateVoteCounts.length > 0) {
          setStats(data);
        } else {
          setStats((prev) => ({
            ...data,
            candidateVoteCounts: [
              { candidateId: 1, name: 'Aromal', count: 0 },
              { candidateId: 2, name: 'Irshad', count: 0 },
              { candidateId: 3, name: 'Manikandan', count: 0 }
            ]
          }));
        }
      }
    } catch (e) {
      console.error('Error fetching admin stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 4000);

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('new-vote', (payload: any) => {
      setLiveEvents((prev) => [
        {
          type: 'cast',
          message: `On-chain block confirmed: Ballot recorded for Candidate #${payload.candidateId}`,
          timestamp: Date.now(),
          txHash: payload.txHash,
        },
        ...prev.slice(0, 19),
      ]);
      fetchStats();
    });

    socket.on('flagged-vote', (payload: any) => {
      setLiveEvents((prev) => [
        {
          type: 'flagged',
          message: `Anomaly flagged: Score ${(payload.riskScore * 100).toFixed(0)}% — ${payload.reasonCodes?.join(', ')}`,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 19),
      ]);
      fetchStats();
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-8 font-sans text-white">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-900 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
            System Overview &amp; Live Flow
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-1">
            Real-time transaction flow &bull; EVM Ledger (127.0.0.1:8545) &bull; AI Service (127.0.0.1:8001)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-neutral-800 bg-neutral-950 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
            <span className={socketConnected ? 'text-white' : 'text-neutral-400'}>
              {socketConnected ? 'Live RPC / WS Active' : 'Polling RPC Node'}
            </span>
          </div>

          <button
            onClick={fetchStats}
            className="p-1.5 border border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-neutral-400 hover:text-white rounded transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-lg">
          <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Total Mined Votes</div>
          <div className="text-3xl font-bold font-mono text-white">{stats.totalVotes}</div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-white" /> Immutable on-chain
          </div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-lg">
          <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Flagged for Audit</div>
          <div className="text-3xl font-bold font-mono text-neutral-200">{stats.flaggedCount}</div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">Non-destructive review flags</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-lg">
          <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Active Elections</div>
          <div className="text-3xl font-bold font-mono text-white">{stats.activeElectionsCount}</div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">Status: Open</div>
        </div>

        <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-lg">
          <div className="text-xs font-mono uppercase text-neutral-500 mb-1">Client Sync Queue</div>
          <div className="text-3xl font-bold font-mono text-white">{stats.pendingSyncCount}</div>
          <div className="text-[11px] text-neutral-500 font-mono mt-1">IndexedDB buffer</div>
        </div>
      </div>

      {/* Live Blockchain Flow: Account Nodes */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-5">
        <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-white" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Active Blockchain Nodes &amp; Account Flow
            </h2>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">Chain ID: 31337 &bull; Hardhat Node</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {nodes.map((node) => (
            <div key={node.id} className="p-3.5 border border-neutral-900 bg-black rounded font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{node.id}</span>
                <span className="text-[10px] px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 rounded text-neutral-400">
                  {node.status}
                </span>
              </div>
              <div className="text-neutral-500 text-[11px]">{node.role}</div>
              <div className="text-neutral-300 text-[10px] truncate" title={node.account}>
                {node.account.slice(0, 10)}...{node.account.slice(-8)}
              </div>
              <div className="text-neutral-400 text-[11px] pt-1 border-t border-neutral-900">
                Balance: <span className="text-white font-bold">{node.balance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Candidate Standings & Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate breakdown */}
        <div className="border border-neutral-800 bg-neutral-950 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
              <Vote className="w-4 h-4 text-white" /> Candidate Tallies
            </h2>
            <span className="text-[10px] font-mono text-neutral-500">Live Smart Contract State</span>
          </div>

          <div className="space-y-4 pt-1">
            {stats.candidateVoteCounts.map((cand) => {
              const total = Math.max(stats.totalVotes, 1);
              const pct = stats.totalVotes > 0 ? Math.round((cand.count / total) * 100) : 0;
              return (
                <div key={cand.candidateId} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-white font-bold">{cand.name}</span>
                    <span className="text-neutral-400">
                      {cand.count} votes ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Transaction & Telemetry Stream */}
        <div className="lg:col-span-2 border border-neutral-800 bg-neutral-950 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-white" /> Live Ingestion Stream
            </h2>
            <Link
              href="/admin/audit"
              className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1 transition"
            >
              Ledger Explorer <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-neutral-900 max-h-72 overflow-y-auto font-mono text-xs">
            {liveEvents.length === 0 ? (
              <div className="py-12 text-center text-neutral-600 text-xs">
                Awaiting ballots... Mined EVM transactions and AI anomaly scores will stream here in real-time.
              </div>
            ) : (
              liveEvents.map((evt, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        evt.type === 'flagged' ? 'bg-neutral-400' : 'bg-white'
                      }`}
                    />
                    <span className="text-neutral-300">{evt.message}</span>
                  </div>
                  {evt.txHash && (
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {evt.txHash.slice(0, 10)}...
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
