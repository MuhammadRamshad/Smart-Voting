'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, RefreshCw, Radio, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoterLoginPage() {
  const router = useRouter();
  const [nfcSupported, setNfcSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualUid, setManualUid] = useState('');
  const [electionId, setElectionId] = useState('0x3bf3952cfe2b5ae1956147b8f53af6c1e4c8c3122466692b2f15185439baf0d1');
  const [loading, setLoading] = useState(false);
  const [scannedCard, setScannedCard] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  const handleNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      toast.error('Web NFC is not supported on this device/browser. Use manual UID entry.');
      return;
    }

    try {
      setScanning(true);
      const ndef = new (window as any).NDEFReader();
      await ndef.scan();
      toast.success('Ready! Tap your NFC Smart Card to the back of this phone.');

      ndef.onreading = (event: any) => {
        const serialNumber = event.serialNumber;
        if (serialNumber) {
          setScannedCard(serialNumber);
          setScanning(false);
          toast.success(`NFC Tag Detected: ${serialNumber}`);
          submitNfcLogin(serialNumber);
        }
      };

      ndef.onreadingerror = () => {
        toast.error('Cannot read NFC card. Please tap again.');
      };
    } catch (err: any) {
      setScanning(false);
      toast.error(err.message || 'Failed to initialize NFC reader.');
    }
  };

  const submitNfcLogin = async (uidToUse: string) => {
    if (!uidToUse.trim()) {
      toast.error('Please tap an NFC card or enter a Card UID');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/nfc-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uidToUse.trim(),
          electionId: electionId.trim(),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'NFC verification failed');
      }

      localStorage.setItem('voter_token', data.token);
      localStorage.setItem('voter_election_id', data.electionId || electionId);
      localStorage.setItem('voter_id', data.voterHashId);
      localStorage.setItem('voter_name', data.voterName || 'Registered Voter');

      toast.success(`Card Authenticated: Welcome ${data.voterName}`);
      router.push('/face-verify');
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 font-mono text-white selection:bg-white selection:text-black">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-white text-black font-bold rounded flex items-center justify-center mx-auto mb-4 text-sm tracking-widest">
          NFC
        </div>
        <h1 className="text-xl font-bold tracking-tight uppercase text-white">
          Smart Card Verification
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Tap your NFC/RFID Voter Card to begin the biometric session
        </p>
      </div>

      <div className="border border-neutral-800 bg-neutral-950 p-6 rounded shadow-2xl space-y-6">
        {/* NFC Tap Area */}
        <div className="border border-dashed border-neutral-700 rounded-lg p-6 text-center space-y-3 bg-black/40">
          <div className="w-14 h-14 mx-auto rounded-full border border-neutral-700 flex items-center justify-center text-neutral-400">
            <Radio className={`w-6 h-6 ${scanning ? 'animate-pulse text-white' : ''}`} />
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              {scanning ? 'Listening for NFC Card...' : 'NFC Card Terminal'}
            </h3>
            <p className="text-[11px] text-neutral-500 mt-1">
              {nfcSupported
                ? 'Hold your voter card against the NFC antenna on this device.'
                : 'Web NFC active on Android Chrome. On laptop, select a demo card below.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleNfcScan}
            disabled={scanning || loading}
            className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-wider rounded transition disabled:opacity-50"
          >
            {scanning ? 'Waiting for Tap...' : 'Scan NFC Card'}
          </button>
        </div>

        {/* Demo Fast Tap Selection */}
        <div>
          <div className="text-[10px] uppercase text-neutral-500 mb-2 font-bold flex items-center justify-between">
            <span>Fast Demo NFC Cards:</span>
            <span className="text-neutral-600">Simulate Tap</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Aromal', uid: 'AROMAL-NFC-001' },
              { label: 'Irshad', uid: 'IRSHAD-NFC-002' },
              { label: 'Mani', uid: 'MANI-NFC-003' },
            ].map((card) => (
              <button
                key={card.uid}
                type="button"
                onClick={() => {
                  setManualUid(card.uid);
                  submitNfcLogin(card.uid);
                }}
                disabled={loading}
                className="p-2 border border-neutral-800 hover:border-neutral-500 bg-neutral-900 rounded text-center text-[11px] transition text-neutral-300 hover:text-white"
              >
                <div className="font-bold">{card.label}</div>
                <div className="text-[9px] text-neutral-600 truncate">{card.uid}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Card UID fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitNfcLogin(manualUid);
          }}
          className="space-y-3 pt-2 border-t border-neutral-900"
        >
          <div>
            <label className="block uppercase text-[10px] text-neutral-500 mb-1 font-bold">
              Manual Card UID Entry / USB RFID Reader
            </label>
            <input
              type="text"
              placeholder="e.g. AROMAL-NFC-001 or Card Hex UID"
              value={manualUid}
              onChange={(e) => setManualUid(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-neutral-800 rounded text-white text-xs focus:outline-none focus:border-white transition placeholder-neutral-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !manualUid.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-neutral-700 hover:border-white text-white font-bold rounded text-xs transition uppercase disabled:opacity-40"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying Card...
              </>
            ) : (
              <>
                Verify Card & Proceed <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
