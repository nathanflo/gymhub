"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
      <Image
        src="/ff-mark.png"
        alt="FloForm"
        width={120}
        height={120}
        priority
        className="object-contain"
      />

      <span className="mt-7 text-2xl font-medium tracking-tight text-neutral-100">
        FloForm
      </span>
    </div>
  );
}
