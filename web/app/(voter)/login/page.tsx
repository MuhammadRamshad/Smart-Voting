'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw, KeyRound, UserCheck } from 'lucide-react';
import { OtpInput } from '@/components/ui/OtpInput';
import toast from 'react-hot-toast';

export default function VoterLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'voter-id' | 'otp'>('voter-id');
  const [voterId, setVoterId] = useState('');
  const [electionId, setElectionId] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterId.trim()) {
      toast.error('Please enter your Voter ID');
      return;
    }

    setLoading(true);
    try {
      const targetElectionId = electionId.trim() || '0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1';
      setElectionId(targetElectionId);

      const resp = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: voterId.trim(), electionId: targetElectionId }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to request OTP');
      }

      toast.success('OTP sent (Check server terminal console)');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Error requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error('Please enter the full 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: voterId.trim(), electionId, otp }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }

      localStorage.setItem('voter_token', data.token);
      localStorage.setItem('voter_election_id', electionId);
      localStorage.setItem('voter_id', voterId.trim());

      toast.success('OTP verified');
      router.push('/face-verify');
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 font-sans text-white selection:bg-white selection:text-black">
      <div className="text-center mb-8">
        <div className="w-10 h-10 bg-white text-black font-bold rounded-lg flex items-center justify-center mx-auto mb-4 text-sm font-mono">
          V
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
          Voter Authentication
        </h1>
        <p className="text-xs text-neutral-500 font-mono mt-1">
          Cryptographically salted voter identity
        </p>
      </div>

      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded-lg shadow-2xl">
        {step === 'voter-id' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block uppercase text-neutral-400 mb-1.5 font-bold">
                Voter Identifier
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. VOTER-101"
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-800 rounded text-white text-xs focus:outline-none focus:border-white transition"
                />
                <UserCheck className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-neutral-600 mt-1">
                keccak256(voterId + salt) generated on submission.
              </p>
            </div>

            <div>
              <label className="block uppercase text-neutral-400 mb-1.5 font-bold">
                Election ID (Optional)
              </label>
              <input
                type="text"
                placeholder="Defaults to active election"
                value={electionId}
                onChange={(e) => setElectionId(e.target.value)}
                className="w-full px-3 py-2.5 bg-black border border-neutral-800 rounded text-neutral-300 text-xs focus:outline-none focus:border-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded text-xs transition uppercase mt-4 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Requesting...
                </>
              ) : (
                <>
                  Request OTP <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 font-mono text-xs">
            <div className="text-center mb-4">
              <KeyRound className="w-5 h-5 text-white mx-auto mb-2" />
              <p className="text-xs text-neutral-300">Enter 6-Digit One-Time Password</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Sent to ID: <span className="text-white">{voterId}</span>
              </p>
            </div>

            <div className="flex justify-center py-2">
              <OtpInput length={6} value={otp} onChange={setOtp} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded text-xs transition uppercase mt-4 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  Verify OTP &amp; Proceed <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep('voter-id')}
                className="text-[10px] text-neutral-500 hover:text-white uppercase transition"
              >
                &larr; Change Voter ID
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
