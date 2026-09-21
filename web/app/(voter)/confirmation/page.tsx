'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Copy, ArrowLeft, Clock, Check } from 'lucide-react';
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
      toast.success('Transaction hash copied');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto p-4 font-sans text-white selection:bg-white selection:text-black">
      <div className="text-center mb-8">
        <div className="w-10 h-10 bg-white text-black font-bold rounded-lg flex items-center justify-center mx-auto mb-4 text-sm font-mono">
          V
        </div>
        <h1 className="text-xl font-bold tracking-tight uppercase font-mono">
          {isOffline ? 'Vote Buffered' : 'Vote Confirmed'}
        </h1>
        <p className="text-xs text-neutral-500 font-mono mt-1">Step 4 of 4 &bull; Complete</p>
      </div>

      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg shadow-2xl text-center">
        {isOffline ? (
          <div className="w-16 h-16 border border-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
        ) : (
          <div className="w-16 h-16 border border-white rounded-full flex items-center justify-center mx-auto mb-4 text-white">
            <CheckCircle2 className="w-8 h-8" />
          </div>
        )}

        <h2 className="text-lg font-bold font-mono uppercase mb-1">
          {isOffline ? 'Queued for Sync' : 'Ballot Sealed On-Chain'}
        </h2>
        <p className="text-xs text-neutral-500 font-mono max-w-sm mx-auto mt-1">
          {isOffline
            ? 'Your ballot is stored locally. It will sync when connectivity is restored.'
            : 'A smart contract event was emitted. No personal data is recorded on-chain.'}
        </p>

        {!isOffline && (
          <div className="border border-neutral-800 bg-black rounded p-4 my-6 text-left space-y-3">
            <div>
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                Transaction Hash
              </span>
              <div className="flex items-center justify-between gap-2 bg-neutral-950 px-3 py-2 rounded border border-neutral-800">
                <span className="font-mono text-xs text-neutral-300 truncate">{txHash}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:text-white text-neutral-500 transition"
                  title="Copy Hash"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-neutral-800">
              <span className="text-neutral-500 font-mono">Block</span>
              <span className="font-mono text-white font-semibold">#{blockNumber}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-500 font-mono">Candidate</span>
              <span className="font-mono text-white font-semibold">{candidate}</span>
            </div>
          </div>
        )}

        <div className="pt-4 flex flex-col gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 border border-neutral-700 hover:border-white text-white font-mono uppercase text-xs rounded transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-neutral-500 font-mono text-xs">Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
