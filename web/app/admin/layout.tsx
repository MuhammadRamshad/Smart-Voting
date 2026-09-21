"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Vote,
  AlertTriangle,
  Search,
  LogOut,
  Menu,
  X,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/voters", label: "Voter Roster & NFC", icon: UserPlus },
  { href: "/admin/elections", label: "Elections & Flow", icon: Vote },
  { href: "/admin/flagged", label: "Flagged Attempts", icon: AlertTriangle },
  { href: "/admin/audit", label: "Audit Ledger", icon: Search },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // If on login page, render without admin navigation chrome
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-black text-white flex font-sans selection:bg-white selection:text-black">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-neutral-950 border-r border-neutral-900 transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 bg-white text-black font-bold text-xs flex items-center justify-center rounded">
              V
            </div>
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Admin Console
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-neutral-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
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
                  "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition",
                  isActive
                    ? "bg-white text-black font-semibold"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-neutral-900 px-3 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-mono text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
          >
            <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-neutral-900 bg-neutral-950 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-neutral-400 hover:text-white p-1"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-xs font-mono uppercase tracking-wider text-white">
              Admin Console
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-400 hover:text-white"
          >
            Exit
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
