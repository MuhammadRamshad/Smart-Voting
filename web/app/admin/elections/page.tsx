'use client';

import React, { useEffect, useState } from 'react';
import { Plus, X, Vote } from 'lucide-react';
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

  const [title, setTitle] = useState('');
  const [candidates, setCandidates] = useState(['Aromal', 'Irshad', 'Manikandan']);
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
        body: JSON.stringify({ title, candidates }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to create election');

      toast.success('Election created and opened!');
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
      if (!resp.ok) throw new Error(data.error || 'Action failed');

      toast.success(`Election status: ${action}`);
      fetchElections();
    } catch (err: any) {
      toast.error(err.message || 'State transition failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
            <Vote className="w-5 h-5" /> Elections
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-1">
            Manage election lifecycle — create, open, close, and audit elections on-chain.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-200 text-black rounded text-xs font-mono transition"
        >
          <Plus className="w-4 h-4" /> New Election
        </button>
      </div>

      <div className="border border-neutral-800 bg-neutral-950 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-black text-neutral-500 uppercase font-mono border-b border-neutral-800 text-[10px]">
              <tr>
                <th className="px-4 py-3">Title / ID</th>
                <th className="px-4 py-3">Candidates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono">
              {elections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-neutral-600">
                    No elections found. Create one to get started.
                  </td>
                </tr>
              ) : (
                elections.map((elec) => (
                  <tr key={elec.electionId} className="hover:bg-neutral-900/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white text-xs">{elec.title}</div>
                      <div className="font-mono text-[10px] text-neutral-600 truncate max-w-xs mt-0.5">
                        {elec.electionId}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {elec.candidates?.length || 0} candidates
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] border ${
                          elec.status === 'Open'
                            ? 'border-white text-white'
                            : elec.status === 'Closed'
                            ? 'border-neutral-700 text-neutral-500'
                            : elec.status === 'Audited'
                            ? 'border-neutral-600 text-neutral-400'
                            : 'border-neutral-800 text-neutral-600'
                        }`}
                      >
                        {elec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-neutral-500">
                      {new Date(elec.startTime).toLocaleDateString()} – {new Date(elec.endTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {elec.status === 'Scheduled' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'open')}
                          className="px-2.5 py-1 border border-neutral-700 hover:border-white text-white rounded text-[10px] font-mono transition"
                        >
                          Open
                        </button>
                      )}
                      {elec.status === 'Open' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'close')}
                          className="px-2.5 py-1 border border-neutral-700 hover:border-white text-white rounded text-[10px] font-mono transition"
                        >
                          Close
                        </button>
                      )}
                      {elec.status === 'Closed' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'audit')}
                          className="px-2.5 py-1 border border-neutral-700 hover:border-white text-white rounded text-[10px] font-mono transition"
                        >
                          Audit
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

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Election">
        <form onSubmit={handleCreateElection} className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">
              Election Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., General Election 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-neutral-800 rounded text-white text-xs focus:outline-none focus:border-neutral-600 font-mono placeholder-neutral-700"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-1">
              Candidates
            </label>
            <div className="space-y-2 mb-2">
              {candidates.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 border border-neutral-800 bg-black rounded text-xs">
                  <span className="text-neutral-300 font-mono">#{i + 1} {c}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCandidate(i)}
                    className="text-neutral-600 hover:text-white p-1 transition"
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
                className="flex-1 px-3 py-1.5 bg-black border border-neutral-800 rounded text-white text-xs focus:outline-none focus:border-neutral-600 font-mono placeholder-neutral-700"
              />
              <button
                type="button"
                onClick={handleAddCandidate}
                className="px-3 py-1.5 border border-neutral-700 hover:border-white text-white rounded text-xs font-mono transition"
              >
                Add
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-mono text-xs rounded transition disabled:opacity-40"
          >
            {submitting ? 'Creating...' : 'Create & Open Election'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
