'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Check, X, Calendar, Vote, ShieldCheck, RefreshCw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

interface ElectionItem {
  electionId: string;
  title: string;
  candidates: Array<{ id: number; name: string }>;
  status: 'Scheduled' | 'Open' | 'Closed' | 'Audited';
  startTime: string;
  endTime: string;
}

export default function ElectionsManagementPage() {
  const [elections, setElections] = useState<ElectionItem[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [candidates, setCandidates] = useState(['Alice Johnson', 'Bob Smith', 'Carol Williams']);
  const [newCandidate, setNewCandidate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchElections = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/elections');
      if (resp.ok) {
        const data = await resp.json();
        setElections(data.elections || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const handleAddCandidate = () => {
    if (newCandidate.trim()) {
      setCandidates([...candidates, newCandidate.trim()]);
      setNewCandidate('');
    }
  };

  const handleRemoveCandidate = (idx: number) => {
    setCandidates(candidates.filter((_, i) => i !== idx));
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (candidates.length < 2) {
      toast.error('At least 2 candidates are required');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('admin_token');

    try {
      const resp = await fetch('/api/admin/elections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          candidates,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to create election');
      }

      toast.success('Election created & opened on blockchain!');
      setShowCreateModal(false);
      setTitle('');
      fetchElections();
    } catch (err: any) {
      toast.error(err.message || 'Error deploying election');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (electionId: string, action: 'open' | 'close' | 'audit') => {
    const token = localStorage.getItem('admin_token');
    try {
      const resp = await fetch(`/api/admin/elections/${electionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast.success(`Election state updated to ${action}`);
      fetchElections();
    } catch (err: any) {
      toast.error(err.message || 'State transition failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Vote className="w-6 h-6 text-blue-400" /> Election Lifecycle Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deploy and transition decentralized ballot states via Election.sol smart contracts
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" /> Deploy New Election
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Election ID / Title</th>
                <th className="px-4 py-3.5">Candidates</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Time Window</th>
                <th className="px-4 py-3.5 text-right">Contract Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {elections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No elections found in database. Create one above to initialize.
                  </td>
                </tr>
              ) : (
                elections.map((elec) => (
                  <tr key={elec.electionId} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-100">{elec.title}</div>
                      <div className="font-mono text-[11px] text-slate-500 truncate max-w-xs">
                        {elec.electionId}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-300">{elec.candidates?.length || 0} registered</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          elec.status === 'Open'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : elec.status === 'Closed'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : elec.status === 'Audited'
                            ? 'bg-purple-950/60 text-purple-400 border border-purple-800/50'
                            : 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                        }`}
                      >
                        {elec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-400">
                      {new Date(elec.startTime).toLocaleDateString()} – {new Date(elec.endTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {elec.status === 'Scheduled' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'open')}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs"
                        >
                          Open Election
                        </button>
                      )}
                      {elec.status === 'Open' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'close')}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs"
                        >
                          Close Ballot
                        </button>
                      )}
                      {elec.status === 'Closed' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'audit')}
                          className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs"
                        >
                          Mark Audited
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Create Election */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Deploy Decentralized Election">
        <form onSubmit={handleCreateElection} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Election Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Faculty Representative Election 2024"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Candidates List
            </label>
            <div className="space-y-2 mb-2">
              {candidates.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                  <span className="text-slate-200">#{i + 1} {c}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCandidate(i)}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Candidate name..."
                value={newCandidate}
                onChange={(e) => setNewCandidate(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCandidate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {submitting ? 'Broadcasting to Chain...' : 'Deploy and Open Election'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
