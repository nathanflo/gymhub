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

/** Round volume to nearest whole kg and locale-format with commas. */
export function formatVolumeKg(n: number): string {
  return Math.round(n).toLocaleString();
}

/** Convert canonical kg to display unit. Returns null for plates (no conversion). */
export function fromKg(weightKg: number, unit?: string): number | null {
  if (!unit || unit === "kg") return weightKg;
  if (unit === "lbs") return weightKg / 0.453592;
  return null; // plates — caller shows raw value
}

/**
 * Resolve a stored weight to canonical kg.
 * New-format sessions (_canonicalKg=true) store weights already in kg.
 * Legacy sessions store weights in exercise.unit — convert via toKg().
 */
export function resolveKg(
  weight: number,
  unit: string | undefined,
  canonical?: boolean
): number | null {
  if (canonical) return weight;
  return toKg(weight, unit);
}
