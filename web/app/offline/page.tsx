'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, RefreshCw, Home } from 'lucide-react';

export default function OfflinePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <WifiOff className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-slate-100 mb-2">You Are Offline</h1>
        <p className="text-xs text-slate-400 mb-6">
          The Smart Voting PWA works offline. If you cast a vote, your encrypted payload has been saved in local IndexedDB and will synchronize automatically when your internet connection is restored.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" /> Check Connection & Reload
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            <Home className="w-3.5 h-3.5" /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
