"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  {
    href: "/fitness",
    label: "Fitness",
    match: (p: string) =>
      p.startsWith("/fitness") ||
      p.startsWith("/workouts") ||
      p.startsWith("/progress") ||
      p.startsWith("/templates") ||
      p.startsWith("/log") ||
      p.startsWith("/edit") ||
      p.startsWith("/session"),
  },
  { href: "/wellness", label: "Wellness", match: (p: string) => p.startsWith("/wellness") },
  { href: "/profile", label: "Profile", match: (p: string) => p.startsWith("/profile") },
];

const AUTH_ROUTES = ["/login", "/reset-password", "/auth/callback"];

export default function Nav() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setSignedIn(!!session)
    );
    return () => subscription.unsubscribe();
  }, []);

  if (isAuthRoute) return null;

  return (
    <header
      className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur border-b border-neutral-800"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <nav className="flex items-center px-4 h-14">
        {/* Brand wordmark = home link */}
        <Link
          href="/"
          className="text-base font-bold text-white tracking-tight"
        >
          FloForm
        </Link>

        {/* Page links */}
        <div className="flex gap-1 ml-auto items-center">
          {links.map(({ href, label, match }) => {
            const isActive = match(pathname);
            // Profile link redirects to login when signed out
            if (href === "/profile" && signedIn === false) {
              return (
                <Link
                  key={href}
                  href="/login"
                  className="px-2 py-2 rounded-lg text-sm transition-colors text-indigo-400 hover:text-indigo-300"
                >
                  {label}
                </Link>
              );
            }
            return (
              <Link
                key={href}
                href={href}
                className={`px-2 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "text-white font-semibold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {label}
              </Link>
            );
          })}

          {signedIn === false && (
            <Link
              href="/login"
              aria-label="Sign in"
              className="px-1.5 py-2 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
