import Link from "next/link";
import { ArrowRight, CheckCircle2, Shield, Cpu, RefreshCw } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-neutral-900 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-black font-bold text-xs">
            V
          </div>
          <span className="font-semibold tracking-tight text-sm text-white">
            Smart Voting System
          </span>
        </div>
        <Link
          href="/login"
          className="text-xs font-mono uppercase tracking-wider px-3.5 py-1.5 border border-neutral-800 hover:border-neutral-600 rounded text-neutral-300 hover:text-white transition"
        >
          Voter Portal
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center max-w-4xl mx-auto w-full">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-xs text-neutral-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Decentralized &amp; Cryptographically Verified
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mt-4">
          Decentralized Voting.
          <br />
          <span className="text-neutral-500">Zero Compromise.</span>
        </h1>

        <p className="mt-6 max-w-xl text-sm md:text-base text-neutral-400 leading-relaxed font-normal">
          Immutable EVM ledger consensus combined with real-time statistical anomaly monitoring. Every ballot cryptographically sealed and independently verifiable.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-black hover:bg-neutral-200 px-6 py-3 rounded-lg text-sm font-semibold transition"
          >
            Access Voter Portal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Minimal feature list */}
        <div className="mt-24 grid gap-6 sm:grid-cols-3 w-full text-left">
          <div className="p-5 border border-neutral-900 bg-neutral-950 rounded-lg">
            <div className="text-xs font-mono uppercase text-neutral-500 mb-2">01 / Consensus</div>
            <h3 className="text-sm font-semibold text-white mb-1">On-Chain Ledger</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every vote is permanently recorded via smart contract events. No administrator can overwrite completed tallies.
            </p>
          </div>

          <div className="p-5 border border-neutral-900 bg-neutral-950 rounded-lg">
            <div className="text-xs font-mono uppercase text-neutral-500 mb-2">02 / Intelligence</div>
            <h3 className="text-sm font-semibold text-white mb-1">Behavioral Telemetry</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Real-time anomaly scoring scrutinizes velocity, duplicate commitments, and rapid burst submissions.
            </p>
          </div>

          <div className="p-5 border border-neutral-900 bg-neutral-950 rounded-lg">
            <div className="text-xs font-mono uppercase text-neutral-500 mb-2">03 / Privacy</div>
            <h3 className="text-sm font-semibold text-white mb-1">Zero PII Leaks</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Voter commitments use salted cryptographic hashes. Plaintext names and credentials never touch the blockchain.
            </p>
          </div>
        </div>
      </main>

      {/* Clean minimal footer */}
      <footer className="border-t border-neutral-900 py-6 px-6 text-center text-xs text-neutral-600 font-mono">
        Smart Voting Protocol &bull; Local EVM RPC 127.0.0.1:8545
      </footer>
    </div>
  );
}
