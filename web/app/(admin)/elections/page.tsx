'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Check, RefreshCw, X, Radio, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Candidate {
  id: number;
  name: string;
}

interface ElectionItem {
  electionId: string;
  title: string;
  candidates: Candidate[];
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
    if (newCandidate.trim() && !candidates.includes(newCandidate.trim())) {
      setCandidates([...candidates, newCandidate.trim()]);
      setNewCandidate('');
    }
  };

  const handleRemoveCandidate = (index: number) => {
    if (candidates.length <= 2) {
      toast.error('At least 2 candidates required');
      return;
    }
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || candidates.length < 2) {
      toast.error('Title and minimum 2 candidates required');
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
          title: title.trim(),
          candidates,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to deploy election');
      }

      toast.success('Election deployed and opened on-chain!');
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
      const resp = await fetch(`/api/admin/elections/${electionId}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        const d = await resp.json();
        throw new Error(d.error || `Failed to execute ${action}`);
      }
      toast.success(`Election state transition: ${action.toUpperCase()}`);
      fetchElections();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-8 font-sans text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-900 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
            Election Lifecycle &amp; Deployment
          </h1>
          <p className="text-xs text-neutral-500 font-mono mt-1">
            Deploy, open, close and transition election states on the immutable smart contract
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchElections}
            className="p-1.5 border border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-neutral-400 hover:text-white rounded transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold px-4 py-2 rounded transition font-mono uppercase"
          >
            <Plus className="w-3.5 h-3.5" /> Deploy Election
          </button>
        </div>
      </div>

      {/* Elections Table */}
      <div className="border border-neutral-800 bg-neutral-950 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-neutral-800 bg-black text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">Election / Identifier</th>
                <th className="px-4 py-3">Candidates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {elections.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-600">
                    No elections found. Deploy an election above.
                  </td>
                </tr>
              ) : (
                elections.map((elec) => (
                  <tr key={elec.electionId} className="hover:bg-neutral-900/50 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white font-sans text-sm">{elec.title}</div>
                      <div className="text-[10px] text-neutral-500 truncate max-w-xs">
                        {elec.electionId}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-400">
                      {elec.candidates?.map(c => c.name).join(', ') || `${elec.candidates?.length || 0} candidates`}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] px-2 py-0.5 border border-neutral-800 rounded uppercase font-bold text-white">
                        {elec.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-neutral-500 text-[11px]">
                      {new Date(elec.startTime).toLocaleDateString()} &ndash; {new Date(elec.endTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {elec.status === 'Scheduled' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'open')}
                          className="px-2.5 py-1 bg-white hover:bg-neutral-200 text-black rounded text-[11px] font-semibold"
                        >
                          Start Election
                        </button>
                      )}
                      {elec.status === 'Open' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'close')}
                          className="px-2.5 py-1 border border-neutral-700 hover:border-neutral-500 bg-neutral-900 text-neutral-300 rounded text-[11px]"
                        >
                          Close Ballot
                        </button>
                      )}
                      {elec.status === 'Closed' && (
                        <button
                          onClick={() => handleAction(elec.electionId, 'audit')}
                          className="px-2.5 py-1 border border-neutral-700 hover:border-neutral-500 bg-neutral-900 text-neutral-300 rounded text-[11px]"
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full border border-neutral-800 bg-neutral-950 p-6 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3 mb-4">
              <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-white">
                Deploy New Election
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateElection} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                  Election Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., General Council 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-black border border-neutral-800 rounded text-white text-xs font-mono focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                  Candidates List
                </label>
                <div className="space-y-1.5 mb-2">
                  {candidates.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-black border border-neutral-900 rounded text-xs font-mono">
                      <span className="text-white">#{i + 1} {c}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(i)}
                        className="text-neutral-500 hover:text-white"
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
                    className="flex-1 px-3 py-1.5 bg-black border border-neutral-800 rounded text-white text-xs font-mono focus:outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCandidate}
                    className="px-3 py-1.5 border border-neutral-800 hover:border-neutral-600 bg-neutral-900 text-white rounded text-xs font-mono font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-semibold rounded text-xs transition font-mono uppercase disabled:opacity-50"
                >
                  {submitting ? 'Deploying On-Chain...' : 'Deploy to Blockchain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
