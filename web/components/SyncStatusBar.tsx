'use client';

import React, { useEffect, useState } from 'react';
import { db, getPendingVotes, replayQueue } from '@/lib/offlineQueue';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
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
        toast.success('Offline votes synced to blockchain');
      }
    } catch (err: any) {
      console.error('[Sync Queue] Replay error:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-2 rounded border border-neutral-800 shadow-xl bg-black text-white text-xs font-mono">
      {!isOnline ? (
        <span className="flex items-center gap-2 text-neutral-400">
          <WifiOff className="w-3.5 h-3.5" /> Offline
        </span>
      ) : (
        <span className="flex items-center gap-2 text-neutral-300">
          <Wifi className="w-3.5 h-3.5" /> Online
        </span>
      )}

      {pendingCount > 0 && (
        <div className="flex items-center gap-2 border-l border-neutral-800 pl-3">
          <span className="text-neutral-400">
            {pendingCount} queued
          </span>
          <button
            onClick={triggerSync}
            disabled={!isOnline || syncing}
            className="p-1 hover:text-white text-neutral-600 transition disabled:opacity-40"
            title="Sync queued votes now"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
};
