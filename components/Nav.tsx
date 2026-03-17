"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const links = [
  { href: "/log", label: "Log", match: (p: string) => p.startsWith("/log") || p.startsWith("/edit") },
  { href: "/workouts", label: "History", match: (p: string) => p.startsWith("/workouts") },
  { href: "/progress", label: "Progress", match: (p: string) => p.startsWith("/progress") },
  { href: "/wellness", label: "Wellness", match: (p: string) => p.startsWith("/wellness") },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setSignedIn(!!session)
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-neutral-900/80 backdrop-blur border-b border-neutral-800">
      <nav className="flex items-center px-4 h-14">
        {/* Brand wordmark = home link */}
        <Link
          href="/"
          className="text-base font-bold text-white tracking-tight"
        >
          GymHub
        </Link>

        {/* Page links */}
        <div className="flex gap-1 ml-auto items-center">
          {links.map(({ href, label, match }) => {
            const isActive = match(pathname);
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
          {signedIn === true && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Account menu"
                className="px-2 py-2 text-sm text-indigo-400 select-none leading-none"
              >
                ●
              </button>

              {menuOpen && (
                <>
                  {/* Backdrop — closes menu on outside tap */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />

                  {/* Popover */}
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px]
                                  rounded-xl bg-neutral-800 border border-neutral-700
                                  shadow-lg py-1 flex flex-col">
                    <span className="px-4 py-2 text-xs text-neutral-500">Signed in</span>
                    <button
                      onClick={async () => {
                        setMenuOpen(false);
                        await supabase.auth.signOut();
                        router.push("/");
                      }}
                      className="px-4 py-2 text-sm text-left text-red-400 hover:bg-neutral-700
                                 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
