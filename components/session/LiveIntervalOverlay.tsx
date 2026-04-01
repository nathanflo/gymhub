"use client";

import { useState, useEffect } from "react";
import { parseIntervalTime, formatIntervalTime } from "./helpers";

export function LiveIntervalOverlay({
  work,
  recover,
  repeat,
  onClose,
}: {
  work: string;
  recover: string;
  repeat: number;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"work" | "recover">("work");
  const [timeRemaining, setTimeRemaining] = useState(() => parseIntervalTime(work));
  const [currentInterval, setCurrentInterval] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Countdown tick
  useEffect(() => {
    if (isPaused || isComplete || timeRemaining <= 0) return;
    const id = setTimeout(() => setTimeRemaining((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeRemaining, isPaused, isComplete]);

  // Phase transition when time hits 0
  useEffect(() => {
    if (timeRemaining > 0 || isPaused || isComplete) return;
    if (phase === "work") {
      setPhase("recover");
      setTimeRemaining(parseIntervalTime(recover));
    } else {
      if (currentInterval >= repeat) {
        setIsComplete(true);
      } else {
        setCurrentInterval((i) => i + 1);
        setPhase("work");
        setTimeRemaining(parseIntervalTime(work));
      }
    }
  }, [timeRemaining, phase, isPaused, isComplete, currentInterval, repeat, work, recover]);

  function handleSkip() {
    if (phase === "work") {
      setPhase("recover");
      setTimeRemaining(parseIntervalTime(recover));
    } else {
      if (currentInterval >= repeat) {
        setIsComplete(true);
      } else {
        setCurrentInterval((i) => i + 1);
        setPhase("work");
        setTimeRemaining(parseIntervalTime(work));
      }
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 ${phase === "recover" ? "bg-indigo-950" : "bg-neutral-950"}`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Top: label + summary */}
      <div className="px-6 pt-6 flex flex-col gap-0.5">
        <p className="text-[11px] text-indigo-400/50 tracking-widest uppercase">Intervals</p>
        <p className="text-sm text-neutral-500">{work} / {recover} × {repeat}</p>
      </div>

      {/* Center: phase + timer + progress */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        {isComplete ? (
          <p className="text-2xl font-bold text-white">Intervals complete</p>
        ) : (
          <>
            <p className={`text-sm font-semibold tracking-widest uppercase ${
              phase === "work" ? "text-white" : "text-indigo-300"
            }`}>
              {phase === "work" ? "Work" : "Recover"}
            </p>
            <p className="text-7xl font-bold tracking-tight text-white tabular-nums">
              {formatIntervalTime(timeRemaining)}
            </p>
            <p className="text-sm text-neutral-500">
              Interval {currentInterval} of {repeat}
            </p>
          </>
        )}
      </div>

      {/* Bottom: controls */}
      <div className="px-6 pb-8 flex flex-col gap-3">
        {isComplete ? (
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-base
                       active:scale-[0.98] transition-all"
          >
            Back to session
          </button>
        ) : (
          <>
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="w-full py-4 rounded-2xl bg-neutral-800 text-white font-semibold text-base
                         active:scale-[0.98] transition-all"
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 rounded-2xl bg-neutral-800/60 text-neutral-400 text-sm
                           active:scale-[0.98] transition-all"
              >
                Skip
              </button>
              <button
                onClick={() => { if (window.confirm("End interval session?")) onClose(); }}
                className="flex-1 py-3 rounded-2xl bg-neutral-800/60 text-neutral-500 text-sm
                           active:scale-[0.98] transition-all"
              >
                End
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
