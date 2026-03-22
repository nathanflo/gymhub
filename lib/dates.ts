/** Returns a Date object set to local midnight for the given date. */
export function localDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Returns "today", "yesterday", or "N days ago" using local calendar days
 * so the label never shifts due to UTC offset.
 */
export function relativeDay(dateStr: string): string {
  const diff = Math.round(
    (localDay(new Date()).getTime() - localDay(new Date(dateStr)).getTime()) /
      86_400_000
  );
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}
