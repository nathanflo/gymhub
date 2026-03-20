"use client";

import { useEffect, useState } from "react";

export default function StartupOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 500);
    const hideTimer = setTimeout(() => setVisible(false), 900);
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
        transition: fading ? "opacity 400ms ease-out" : undefined,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Icon mark — stylised "F" built from three rectangles */}
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="10" y="10" width="28" height="4" rx="2" fill="#818cf8" />
        <rect x="10" y="22" width="18" height="4" rx="2" fill="#818cf8" />
        <rect x="10" y="10" width="4" height="28" rx="2" fill="#818cf8" />
      </svg>

      <span className="mt-4 text-xl font-bold tracking-tight text-white">
        FloForm
      </span>
    </div>
  );
}
