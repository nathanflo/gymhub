"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/log", label: "Log", match: (p: string) => p.startsWith("/log") || p.startsWith("/edit") },
  { href: "/workouts", label: "History", match: (p: string) => p.startsWith("/workouts") },
  { href: "/progress", label: "Progress", match: (p: string) => p.startsWith("/progress") },
  { href: "/wellness", label: "Wellness", match: (p: string) => p.startsWith("/wellness") },
];

export default function Nav() {
  const pathname = usePathname();

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
        <div className="flex gap-1 ml-auto">
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
        </div>
      </nav>
    </header>
  );
}
