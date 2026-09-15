'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, X, ShieldAlert, FileText, Info, RefreshCw, Search } from 'lucide-react';
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
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to save review');
      }

      toast.success('Review status saved! (Ballot record remains immutable)');
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
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-400" /> AI Anomaly Human Review Queue
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review behaviorally flagged attempts. Actions represent audit annotations only and never alter the underlying blockchain ballot.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          {(['pending', 'reviewed', 'escalated', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                filter === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={fetchFlags}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs text-slate-300 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Risk Score</th>
                <th className="px-4 py-3.5">Reason Codes</th>
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Review Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {flags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No flagged items matching the current filter.
                  </td>
                </tr>
              ) : (
                flags.map((item) => (
                  <tr key={item.attemptId} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">
                      <RiskBadge score={item.riskScore} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {item.reasonCodes.map((code) => (
                          <span
                            key={code}
                            className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] uppercase font-semibold ${
                          item.reviewStatus === 'pending'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                            : item.reviewStatus === 'cleared'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                        }`}
                      >
                        {item.reviewStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
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

      {/* Detail Modal */}
      {selectedFlag && (
        <Modal isOpen={Boolean(selectedFlag)} onClose={() => setSelectedFlag(null)} title="Inspect Flagged Attempt">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <p className="text-[11px] text-slate-400">Attempt ID</p>
                <p className="font-mono text-xs text-slate-200">{selectedFlag.attemptId}</p>
              </div>
              <RiskBadge score={selectedFlag.riskScore} />
            </div>

            {/* Contributing factors */}
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Model Decision Breakdown</p>
              <div className="space-y-2">
                {selectedFlag.contributingFactors?.map((f, i) => (
                  <div key={i} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-300 capitalize">{f.factor.replace(/_/g, ' ')}:</span>{' '}
                      <span className="text-slate-400 text-[11px]">{f.detail}</span>
                    </div>
                    <span className="font-mono text-[11px] text-amber-400 font-bold ml-2">
                      +{f.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence caveat requirement */}
            <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p>{selectedFlag.confidenceCaveat}</p>
            </div>

            {/* Review actions */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Official Annotation Note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Record review observations..."
                  rows={2}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActionStatus('cleared')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                    actionStatus === 'cleared'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Mark Cleared
                </button>
                <button
                  type="button"
                  onClick={() => setActionStatus('reviewed')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                    actionStatus === 'reviewed'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Mark Reviewed
                </button>
                <button
                  type="button"
                  onClick={() => setActionStatus('escalated')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition ${
                    actionStatus === 'escalated'
                      ? 'bg-red-600 text-white border-red-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Escalate
                </button>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveReview}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {saving ? 'Saving Annotation...' : 'Submit Human Review Annotation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
