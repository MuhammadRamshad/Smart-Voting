import { Shield } from "lucide-react";

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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-gradient-to-r from-blue-950 via-slate-900 to-violet-950">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-blue-700/30 border border-blue-600/40 p-2">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight">
              Smart Voting System
            </h1>
            <p className="text-xs text-slate-400">
              Blockchain-secured • End-to-end encrypted
            </p>
          </div>
        </div>
      </header>

      {/* Step Progress Bar (visual indicator — active step managed per page) */}
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-3xl px-6 py-3">
          <div className="flex items-center gap-0">
            {STEPS.map((step, idx) => (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-slate-600" />
                  <span className="text-xs text-slate-500 hidden sm:block whitespace-nowrap">
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="h-px flex-1 bg-slate-700 mx-2 mb-3 sm:mb-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-lg">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/30 py-4">
        <p className="text-center text-xs text-slate-600">
          Powered by Blockchain + AI &nbsp;|&nbsp; Academic Prototype
        </p>
      </footer>
    </div>
  );
}
