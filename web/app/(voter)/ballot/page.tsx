'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, AlertCircle, RefreshCw, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Candidate {
  id: number;
  name: string;
}

export default function BallotPage() {
  const router = useRouter();

  const [electionId, setElectionId] = useState('');
  const [electionTitle, setElectionTitle] = useState('General Election 2026');
  const [candidates, setCandidates] = useState<Candidate[]>([
    { id: 1, name: 'Aromal' },
    { id: 2, name: 'Irshad' },
    { id: 3, name: 'Manikandan' },
  ]);

  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedElectionId =
      localStorage.getItem('voter_election_id') ||
      '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1';
    setElectionId(savedElectionId);

    const fetchElection = async () => {
      try {
        const resp = await fetch('/api/admin/elections');
        if (resp.ok) {
          const data = await resp.json();
          const match = data.elections?.find((e: any) => e.electionId === savedElectionId);
          if (match) {
            setElectionTitle(match.title);
            if (match.candidates && match.candidates.length > 0) {
              setCandidates(match.candidates);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load election candidates:', err);
      }
    };
    fetchElection();
  }, []);

  const handleCastVote = async () => {
    if (!selectedCandidate) return;
    setSubmitting(true);

    const voterToken = localStorage.getItem('voter_token');
    const voterId = localStorage.getItem('voter_id') || 'DEMO-VOTER';

    try {
      const resp = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${voterToken}`,
        },
        body: JSON.stringify({
          electionId,
          candidateId: selectedCandidate,
          voterCommitment: voterId,
          clientRequestId: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientTelemetry: {
            timeTakenMs: 4200,
            screenRes: `${window.innerWidth}x${window.innerHeight}`,
            touchEventsCount: 3,
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to submit vote');
      }

      // Store confirmation data for the confirmation page
      const candidateName = candidates.find(c => c.id === selectedCandidate)?.name || 'Unknown';
      sessionStorage.setItem('last_txHash', data.txHash || '0xMockHash');
      sessionStorage.setItem('last_blockNumber', String(data.blockNumber || ''));
      sessionStorage.setItem('last_candidate', candidateName);

      toast.success('Ballot recorded on blockchain!');
      router.push('/confirmation');
    } catch (err: any) {
      toast.error(err.message || 'Error submitting ballot');
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 font-sans text-white selection:bg-white selection:text-black">
      <div className="text-center mb-8">
        <div className="w-10 h-10 bg-white text-black font-bold rounded-lg flex items-center justify-center mx-auto mb-4 text-sm font-mono">
          V
        </div>
        <h1 className="text-xl font-bold tracking-tight uppercase font-mono text-white">
          Official Ballot
        </h1>
        <p className="text-xs text-neutral-500 font-mono mt-1">
          {electionTitle} &bull; Select one candidate
        </p>
      </div>

      {/* Candidate List */}
      <div className="space-y-3 mb-8">
        {candidates.map((cand) => {
          const isSelected = selectedCandidate === cand.id;
          return (
            <div
              key={cand.id}
              onClick={() => setSelectedCandidate(cand.id)}
              className={`p-4 border rounded-lg cursor-pointer transition flex items-center justify-between font-mono text-xs ${
                isSelected
                  ? 'border-white bg-neutral-900 text-white'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-600 font-bold">#{cand.id}</span>
                <span className="font-sans text-sm font-semibold text-white">{cand.name}</span>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-white bg-white text-black' : 'border-neutral-700'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Button */}
      <button
        onClick={() => setShowConfirmModal(true)}
        disabled={!selectedCandidate || submitting}
        className="w-full py-3 bg-white hover:bg-neutral-200 text-black font-semibold rounded text-xs transition uppercase font-mono disabled:opacity-40 flex items-center justify-center gap-2"
      >
        Submit Ballot Sealed to Ledger <ArrowRight className="w-4 h-4" />
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-sm w-full border border-neutral-800 bg-neutral-950 p-6 rounded-lg shadow-2xl font-mono text-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
              Confirm Ballot Submission
            </h2>
            <p className="text-neutral-400 mb-4">
              You are voting for{' '}
              <strong className="text-white">
                {candidates.find((c) => c.id === selectedCandidate)?.name}
              </strong>
              . This transaction is permanent and cannot be altered or retracted.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white rounded uppercase text-[11px]"
              >
                Cancel
              </button>
              <button
                onClick={handleCastVote}
                disabled={submitting}
                className="flex-1 py-2 bg-white hover:bg-neutral-200 text-black font-bold rounded uppercase text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Mining...
                  </>
                ) : (
                  'Confirm & Mine'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
