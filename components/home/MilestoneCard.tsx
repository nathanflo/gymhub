"use client";

type MilestoneCardProps = {
  title: string;
  subtitle?: string;
  onDismiss: () => void;
};

export default function MilestoneCard({ title, subtitle, onDismiss }: MilestoneCardProps) {
  return (
    <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900 px-5 pt-4 pb-5 flex flex-col animate-[floFormFadeUp_200ms_ease-out_40ms_both]">
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-5 right-5 h-px bg-indigo-500/20 rounded-full" />

      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute top-3.5 right-4 text-neutral-600 hover:text-neutral-300 transition-colors text-base leading-none"
      >
        ×
      </button>

      <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600 mb-2.5">
        FloForm
      </p>
      <p className="text-2xl font-semibold text-white leading-snug pr-6">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-neutral-600 mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
