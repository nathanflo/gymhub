"use client";

export default function PatternInsights({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 px-5 py-5 flex flex-col gap-3">
      <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
        Patterns
      </p>
      {insights.map((insight, i) => (
        <p key={i} className="text-sm text-neutral-400">
          {insight}
        </p>
      ))}
    </div>
  );
}
