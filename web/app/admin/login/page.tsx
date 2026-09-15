'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, User, RefreshCw, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('admin_token', data.token);
      toast.success('Authenticated');
      router.push('/admin/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white font-sans selection:bg-white selection:text-black">
      <div className="max-w-sm w-full border border-neutral-800 bg-neutral-950 p-8 rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-white text-black font-bold rounded-lg flex items-center justify-center mx-auto mb-4 text-sm font-mono">
            SYS
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">System Administration</h1>
          <p className="text-xs text-neutral-500 mt-1 font-mono">
            Restricted Control Console
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-white transition font-mono"
              />
              <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-white transition font-mono"
              />
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded-lg text-sm transition mt-6 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Enter Console <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center text-[11px] text-neutral-600 font-mono mt-6 border-t border-neutral-900 pt-4">
          Access credentials: <span className="text-neutral-400">admin / admin</span>
        </div>
      </div>
    </div>
  );
}
