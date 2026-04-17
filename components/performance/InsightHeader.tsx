"use client";

interface InsightHeaderProps {
  headline: string;
  subtext?: string;
}

export default function InsightHeader({ headline, subtext }: InsightHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5 pb-2">
      <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-neutral-600">
        Performance
      </p>
      <h1 className="text-3xl font-semibold text-white leading-tight">
        {headline}
      </h1>
      {subtext && (
        <p className="text-xs text-neutral-500">{subtext}</p>
      )}
    </div>
  );
}
