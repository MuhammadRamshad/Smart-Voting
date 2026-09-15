'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Copy, ArrowLeft, ShieldCheck, Clock, ExternalLink, Hash, Check } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import toast from 'react-hot-toast';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOffline = searchParams.get('offline') === 'true';

  const [txHash, setTxHash] = useState('');
  const [blockNumber, setBlockNumber] = useState('');
  const [candidate, setCandidate] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTxHash(sessionStorage.getItem('last_txHash') || '0x49f2b1a8c3e809bdf...mock_tx');
    setBlockNumber(sessionStorage.getItem('last_blockNumber') || '12');
    setCandidate(sessionStorage.getItem('last_candidate') || 'Selected Candidate');
  }, []);

  const handleCopy = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      setCopied(true);
      toast.success('Transaction Hash copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-100">
          {isOffline ? 'Vote Buffered in Offline Queue' : 'Ballot Cast Successfully!'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {isOffline
            ? 'Cryptographic commitment saved locally with idempotency key'
            : 'Permanently sealed on the distributed blockchain ledger'}
        </p>
      </div>

      <ProgressBar currentStep={4} totalSteps={4} labels={['MFA OTP', 'Face Liveness', 'Cast Ballot', 'Confirmed']} />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl mt-6 text-center">
        {isOffline ? (
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-lg shadow-amber-500/10">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>
        ) : (
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        )}

        <h2 className="text-xl font-bold text-slate-100 mb-1">
          {isOffline ? 'Queued for Autonomous Sync' : 'Vote Confirmed On-Chain'}
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          {isOffline
            ? 'Your device is disconnected. The ballot payload is stored in client IndexedDB and will execute with zero double-count risk as soon as connectivity resumes.'
            : 'A decentralized smart contract event (VoteCast) was emitted with zero personally identifiable data.'}
        </p>

        {!isOffline && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 my-6 text-left space-y-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Transaction Hash
              </span>
              <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                <span className="font-mono text-xs text-blue-300 truncate">{txHash}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:text-white text-slate-400 transition"
                  title="Copy Hash"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Block Number:</span>
              <span className="font-mono text-slate-200 font-semibold">#{blockNumber}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Candidate Recorded:</span>
              <span className="font-semibold text-blue-400">{candidate}</span>
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Welcome Screen
          </button>

          {!isOffline && (
            <button
              onClick={() => router.push('/admin/audit')}
              className="w-full py-2.5 px-4 bg-blue-950/40 hover:bg-blue-900/40 text-blue-300 border border-blue-800/50 font-semibold rounded-xl transition text-xs flex items-center justify-center gap-1.5"
            >
              Verify in Public Audit Trail <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading confirmation...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
