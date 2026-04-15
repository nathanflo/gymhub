"use client";

type MilestoneCardProps = {
  title: string;
  subtitle: string;
  onDismiss: () => void;
};

export default function MilestoneCard({ title, subtitle, onDismiss }: MilestoneCardProps) {
  return (
    <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-5 flex flex-col gap-1.5 animate-[floFormFadeUp_180ms_ease-out_both]">
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors text-lg leading-none"
      >
        ×
      </button>
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-indigo-400/60">
        FloForm
      </p>
      <p className="text-2xl font-black text-white leading-tight pr-6">{title}</p>
      <p className="text-sm text-neutral-400">{subtitle}</p>
    </div>
  );
}
