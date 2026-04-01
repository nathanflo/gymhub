/** Parse "3:00" or "0:45" → total seconds. Returns 0 for invalid input. */
export function parseIntervalTime(str: string): number {
  const parts = str.trim().split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s;
  }
  const secs = parseInt(str, 10);
  return isNaN(secs) ? 0 : secs;
}

/** Format seconds → "m:ss" (e.g. 134 → "2:14"). */
export function formatIntervalTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
