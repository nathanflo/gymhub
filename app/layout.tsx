import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import StartupOverlay from "@/components/StartupOverlay";
import { Analytics } from "@vercel/analytics/react";


export const metadata: Metadata = {
  title: "FloForm",
  description: "Your personal fitness operating system",
  // Future: add og:image, twitter card, etc.
};

export const viewport: Viewport = {
  // Ensures the app fills the full iPhone screen without zoom
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Honor iPhone safe areas (notch, home bar)
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/ff-mark.svg" as="image" type="image/svg+xml" />
        {/* Capture recovery flag BEFORE Supabase initializes and clears the URL.
            Handles both implicit flow (#type=recovery) and PKCE flow (?code= on /reset-password). */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var h = window.location.hash;
            var s = window.location.search;
            var p = window.location.pathname;
            if (h.includes('type=recovery') ||
                (p === '/reset-password' && s.includes('code='))) {
              sessionStorage.setItem('passwordRecovery', '1');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="min-h-[100svh] bg-neutral-950 text-neutral-100 font-sans">
        <StartupOverlay />
        {/*
         * Shell wrapper – keeps max width iPhone-sized and centered on desktop.
         * min-h-[100svh] uses the small viewport height (URL bar visible) to avoid
         * the Safari 100vh bug where 100vh > visible area, causing phantom scroll.
         */}
        <div className="mx-auto max-w-md min-h-[100svh] flex flex-col">
          <Nav />
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
