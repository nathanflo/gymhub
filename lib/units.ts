/**
 * Canonical weight conversion for internal math.
 * All volume aggregations and cross-session comparisons should use kg.
 *
 * Returns null for unsupported units (plates, unknown) — callers must
 * skip null values explicitly rather than treating them as zero.
 */
export function toKg(weight: number, unit?: string): number | null {
  if (!unit || unit === "kg") return weight;
  if (unit === "lbs") return weight * 0.453592;
  return null; // "plates" or unknown — caller must skip
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
