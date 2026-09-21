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
  title: "Smart Voting System",
  description: "Secure blockchain-based voting with AI fraud detection.",
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
  themeColor: "#000000",
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
      <body className="min-h-screen bg-black text-white font-sans antialiased selection:bg-white selection:text-black">
        <div className="relative min-h-screen">{children}</div>
        <SyncStatusBar />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#111111",
              color: "#ffffff",
              border: "1px solid #222222",
              borderRadius: "0.375rem",
              fontFamily: "monospace",
              fontSize: "12px",
            },
            success: {
              iconTheme: { primary: "#ffffff", secondary: "#000000" },
            },
            error: {
              iconTheme: { primary: "#ff4444", secondary: "#000000" },
            },
          }}
        />
      </body>
    </html>
  );
}
