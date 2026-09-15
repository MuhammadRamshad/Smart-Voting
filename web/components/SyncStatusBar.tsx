'use client';

import React, { useEffect, useState } from 'react';
import { db, getPendingVotes, replayQueue } from '@/lib/offlineQueue';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SyncStatusBar: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check IndexedDB pending votes
    const checkPending = async () => {
      try {
        const pending = await getPendingVotes();
        setPendingCount(pending.length);
      } catch (e) {
        // Dexie might not be ready in SSR
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] Registered with scope:', reg.scope);
        })
        .catch((err) => console.warn('[SW] Registration failed:', err));

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_VOTES') {
          triggerSync();
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      await replayQueue(async (vote) => {
        const resp = await fetch('/api/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${vote.authToken}`,
          },
          body: JSON.stringify({
            electionId: vote.electionId,
            candidateId: vote.candidateId,
            clientRequestId: vote.clientRequestId,
            voterCommitment: vote.voterCommitment,
            deviceFingerprintHash: 'offline_replayed',
          }),
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || 'Failed to sync vote');
        }
      });

      const remaining = await getPendingVotes();
      setPendingCount(remaining.length);
      if (remaining.length === 0) {
        toast.success('Offline votes successfully synced to blockchain!');
      }
    } catch (err: any) {
      console.error('[Sync Queue] Replay error:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) {
    return null; // Don't clutter UI when all normal
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-xl backdrop-blur-md transition-all bg-slate-900/90 border-slate-700 text-slate-200">
      {!isOnline ? (
        <span className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
          <WifiOff className="w-4 h-4" /> Offline Mode
        </span>
      ) : (
        <span className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
          <Wifi className="w-4 h-4" /> Online
        </span>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 text-xs border-l border-slate-700 pl-3">
          <span className="text-slate-300">
            {pendingCount} vote{pendingCount > 1 ? 's' : ''} queued
          </span>
          <button
            onClick={triggerSync}
            disabled={!isOnline || syncing}
            className="p-1 hover:bg-slate-800 rounded transition disabled:opacity-40"
            title="Sync queued votes now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
          </button>
        </div>
      )}
    </div>
  );
};
