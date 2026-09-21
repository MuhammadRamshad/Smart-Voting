"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Vote,
  AlertTriangle,
  Search,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/elections", label: "Elections", icon: Vote },
  { href: "/admin/flagged", label: "Flagged", icon: AlertTriangle },
  { href: "/admin/audit", label: "Audit Trail", icon: Search },
];

export default function OldAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-black border-r border-neutral-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white text-black font-bold text-[10px] flex items-center justify-center rounded font-mono">
              V
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none font-mono uppercase">
                VoteSecure
              </p>
              <p className="text-[10px] text-neutral-600 mt-0.5 font-mono">Admin</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-neutral-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <span className="inline-block border border-neutral-700 px-2.5 py-0.5 text-[10px] font-mono uppercase text-neutral-400 rounded">
            ADMIN
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded px-3 py-2 text-xs font-mono transition-all duration-150 ${
                  isActive
                    ? "bg-white text-black"
                    : "text-neutral-500 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
                {label === "Flagged" && (
                  <span className="ml-auto w-4 h-4 flex items-center justify-center rounded-full bg-neutral-700 text-[10px] font-mono text-white">
                    !
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-900 px-3 py-4">
          <button
            onClick={() => {
              localStorage.removeItem('admin_token');
              window.location.href = '/admin/login';
            }}
            className="flex w-full items-center gap-3 rounded px-3 py-2 text-xs font-mono text-neutral-500 hover:text-white hover:bg-neutral-900 transition"
          >
            <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 border-b border-neutral-900 bg-black px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-neutral-500 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-xs font-mono text-neutral-300 uppercase">Admin Console</span>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
