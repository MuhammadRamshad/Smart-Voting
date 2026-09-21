'use client';

import { RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white">
      <div className="max-w-md w-full border border-neutral-800 bg-neutral-950 rounded-lg p-8 text-center shadow-2xl">
        <div className="w-12 h-12 border border-neutral-700 rounded-full flex items-center justify-center mx-auto mb-6 text-neutral-400">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold font-mono uppercase mb-2 text-white">Offline</h1>
        <p className="text-xs text-neutral-500 font-mono mb-6">
          You have lost connectivity. Your vote commitment has been stored locally and will sync automatically when the connection is restored.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-neutral-700 hover:border-white text-white rounded text-xs font-mono transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
        </button>
      </div>
    </div>
  );
}
