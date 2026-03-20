"use client";

import { useEffect, useState } from "react";

export default function StartupOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 650);
    const hideTimer = setTimeout(() => setVisible(false), 1100);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        backgroundColor: "#0a0a0a",
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 450ms ease-out" : undefined,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Inline FF mark — renders instantly, no network round-trip */}
      <svg
        width="96"
        height="96"
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Top horizontal bar */}
        <rect x="16" y="16" width="48" height="8" rx="4" fill="#818cf8" />
        {/* Mid horizontal bar (shorter) */}
        <rect x="16" y="36" width="32" height="8" rx="4" fill="#818cf8" />
        {/* Vertical stem */}
        <rect x="16" y="16" width="8" height="48" rx="4" fill="#818cf8" />
      </svg>

      <span className="mt-7 text-2xl font-medium tracking-tight text-neutral-100">
        FloForm
      </span>
    </div>
  );
}
