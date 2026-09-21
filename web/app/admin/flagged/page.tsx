'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

interface FlaggedVote {
  attemptId: string;
  electionId: string;
  voterHashId: string;
  riskScore: number;
  reasonCodes: string[];
  contributingFactors: Array<{ factor: string; weight: number; detail: string }>;
  confidenceCaveat: string;
  reviewStatus: 'pending' | 'reviewed' | 'cleared' | 'escalated';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
}

export default function FlaggedReviewPage() {
  const [flags, setFlags] = useState<FlaggedVote[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'escalated'>('pending');
  const [selectedFlag, setSelectedFlag] = useState<FlaggedVote | null>(null);
  const [note, setNote] = useState('');
  const [actionStatus, setActionStatus] = useState<'reviewed' | 'cleared' | 'escalated'>('reviewed');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/admin/flagged' : `/api/admin/flagged?status=${filter}`;
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setFlags(data.flaggedVotes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [filter]);

  const handleOpenModal = (flag: FlaggedVote) => {
    setSelectedFlag(flag);
    setNote(flag.reviewNote || '');
    setActionStatus(flag.reviewStatus === 'pending' ? 'reviewed' : (flag.reviewStatus as any));
  };

  const handleSaveReview = async () => {
    if (!selectedFlag) return;
    setSaving(true);
    const token = localStorage.getItem('admin_token');

    try {
      const resp = await fetch('/api/admin/flagged', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attemptId: selectedFlag.attemptId,
          reviewStatus: actionStatus,
          reviewNote: note,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to save review');

      toast.success('Review annotation saved');
      setSelectedFlag(null);
      fetchFlags();
    } catch (err: any) {
      toast.error(err.message || 'Error updating record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
          <AlertTriangle className="w-5 h-5" /> Flagged Attempts
        </h1>
        <p className="text-xs text-neutral-500 font-mono mt-1">
          Review AI-flagged voting attempts. Actions are annotations only — blockchain records are immutable.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 p-1 border border-neutral-800 rounded bg-neutral-950">
          {(['pending', 'reviewed', 'escalated', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded text-xs font-mono uppercase transition ${
                filter === tab
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={fetchFlags}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-800 hover:border-neutral-600 rounded text-xs text-neutral-400 hover:text-white font-mono transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="border border-neutral-800 bg-neutral-950 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-black text-neutral-500 uppercase font-mono border-b border-neutral-800 text-[10px]">
              <tr>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Reason Codes</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono">
              {flags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-neutral-600">
                    No flagged items for this filter.
                  </td>
                </tr>
              ) : (
                flags.map((item) => (
                  <tr key={item.attemptId} className="hover:bg-neutral-900/50 transition">
                    <td className="px-4 py-3">
                      <RiskBadge score={item.riskScore} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.reasonCodes.map((code) => (
                          <span
                            key={code}
                            className="px-2 py-0.5 rounded border border-neutral-800 text-neutral-400 text-[10px]"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-[10px]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase border ${
                          item.reviewStatus === 'pending'
                            ? 'border-neutral-700 text-neutral-400'
                            : item.reviewStatus === 'cleared'
                            ? 'border-neutral-600 text-white'
                            : 'border-neutral-700 text-neutral-500'
                        }`}
                      >
                        {item.reviewStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="px-3 py-1 border border-neutral-700 hover:border-white text-white rounded text-[10px] font-mono transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedFlag && (
        <Modal isOpen={Boolean(selectedFlag)} onClose={() => setSelectedFlag(null)} title="Inspect Flagged Attempt">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-neutral-800 bg-black rounded">
              <div>
                <p className="text-[10px] text-neutral-500 font-mono">Attempt ID</p>
                <p className="font-mono text-xs text-white">{selectedFlag.attemptId}</p>
              </div>
              <RiskBadge score={selectedFlag.riskScore} />
            </div>

            <div>
              <p className="text-xs font-mono uppercase text-neutral-500 mb-2">Decision Breakdown</p>
              <div className="space-y-2">
                {selectedFlag.contributingFactors?.map((f, i) => (
                  <div key={i} className="p-2.5 border border-neutral-800 bg-black rounded text-xs flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-neutral-300 capitalize">{f.factor.replace(/_/g, ' ')}:</span>{' '}
                      <span className="text-neutral-500 text-[10px]">{f.detail}</span>
                    </div>
                    <span className="font-mono text-[10px] text-white font-bold ml-2">+{f.weight}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border border-neutral-800 bg-black rounded text-xs text-neutral-400 font-mono flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-neutral-500" />
              <p>{selectedFlag.confidenceCaveat}</p>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">
                  Annotation Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Record review observations..."
                  rows={2}
                  className="w-full p-2.5 bg-black border border-neutral-800 rounded text-xs text-neutral-200 focus:outline-none focus:border-neutral-600 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActionStatus('cleared')}
                  className={`flex-1 py-2 text-xs font-mono rounded border transition ${
                    actionStatus === 'cleared'
                      ? 'bg-white text-black border-white'
                      : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  Cleared
                </button>
                <button
                  type="button"
                  onClick={() => setActionStatus('reviewed')}
                  className={`flex-1 py-2 text-xs font-mono rounded border transition ${
                    actionStatus === 'reviewed'
                      ? 'bg-white text-black border-white'
                      : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  Reviewed
                </button>
                <button
                  type="button"
                  onClick={() => setActionStatus('escalated')}
                  className={`flex-1 py-2 text-xs font-mono rounded border transition ${
                    actionStatus === 'escalated'
                      ? 'bg-white text-black border-white'
                      : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  Escalate
                </button>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveReview}
                className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-mono text-xs rounded transition disabled:opacity-40"
              >
                {saving ? 'Saving...' : 'Submit Annotation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
