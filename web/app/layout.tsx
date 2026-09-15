import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Voting System | Blockchain-Powered",
  description:
    "Secure blockchain-based voting with AI fraud detection. Academic prototype.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoteSecure",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <div className="relative min-h-screen">{children}</div>
        <SyncStatusBar />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1e293b",
              color: "#f1f5f9",
              border: "1px solid #334155",
              borderRadius: "0.5rem",
            },
            success: {
              iconTheme: { primary: "#16a34a", secondary: "#f1f5f9" },
            },
            error: {
              iconTheme: { primary: "#dc2626", secondary: "#f1f5f9" },
            },
          }}
        />
      </body>
    </html>
  );
}
