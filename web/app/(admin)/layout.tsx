"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Vote,
  AlertTriangle,
  Search,
  LogOut,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/elections", label: "Elections", icon: Vote },
  { href: "/admin/flagged", label: "Flagged Votes", icon: AlertTriangle },
  { href: "/admin/audit", label: "Audit Trail", icon: Search },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-surface border-r border-slate-700/50 transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "#1e293b" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-lg bg-blue-700/30 border border-blue-600/40 p-1.5">
              <Shield className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100 leading-none">
                VoteSecure
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Admin Console</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden rounded-md p-1 text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 pt-4">
          <span className="inline-flex items-center rounded-md border border-blue-700/40 bg-blue-900/30 px-2.5 py-1 text-xs font-semibold text-blue-300 uppercase tracking-wider">
            ADMIN
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-blue-700/20 text-blue-300 border border-blue-700/30"
                    : "text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 border border-transparent"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
                {label === "Flagged Votes" && (
                  <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600/80 px-1 text-xs font-bold text-white">
                    !
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-slate-700/50 px-3 py-4">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-700/40 hover:text-slate-200 transition-all duration-150">
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="flex items-center gap-4 border-b border-slate-800 bg-slate-900/50 px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-slate-200">
            Admin Console
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
