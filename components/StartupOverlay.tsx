"use client";

import { useEffect, useState } from "react";

export default function StartupOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 700);
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
        transition: fading ? "opacity 400ms ease-out" : undefined,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      
      <div className="mb-8">
        <img
          src="/AppIcon-512@2x.png"
          alt="FloForm"
          className="w-24 h-24 object-contain"
        />
      </div>

      <span className="mt-6 text-2xl font-medium tracking-tight text-neutral-100">
        FloForm
      </span>
    </div>
  );
}
