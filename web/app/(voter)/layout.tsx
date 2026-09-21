import Link from "next/link";

const STEPS = [
  { label: "Login", href: "/login" },
  { label: "Face Verify", href: "/face-verify" },
  { label: "Ballot", href: "/ballot" },
  { label: "Confirmation", href: "/confirmation" },
];

export default function VoterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col selection:bg-white selection:text-black font-sans text-white">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-black">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white text-black font-bold text-xs flex items-center justify-center rounded font-mono">
              V
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight font-mono uppercase">
                Smart Voting System
              </h1>
              <p className="text-[10px] text-neutral-500 font-mono">
                Blockchain-secured &bull; Cryptographically verified
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-4">
        <p className="text-center text-[11px] text-neutral-700 font-mono">
          Smart Voting Protocol &bull; EVM + AI Secured
        </p>
      </footer>
    </div>
  );
}
