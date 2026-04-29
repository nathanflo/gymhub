"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { initStatusBar } from "@/lib/statusBar";
import { initKeyboard } from "@/lib/keyboard";
import { initSentry } from "@/lib/sentry";
import { initAnalytics } from "@/lib/analytics";

export default function StartupOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 650);
    const hideTimer = setTimeout(() => setVisible(false), 1100);

    // Initialize native plugins + observability once on cold launch.
    // All calls are fire-and-forget; errors are caught internally.
    initSentry();
    initStatusBar();
    initKeyboard();
    initAnalytics();

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
      <Image
        src="/ff-mark.svg"
        alt="FloForm"
        width={160}
        height={160}
        priority
        className="object-contain"
      />

      <span className="mt-7 text-2xl font-medium tracking-tight text-neutral-100">
        FloForm
      </span>
    </div>
  );
}
