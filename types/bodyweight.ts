/**
 * Bodyweight entry type.
 *
 * Future additions:
 * - notes: string          (for wellness context, e.g. "morning fasted")
 * - unit: "kg" | "lb"      (unit preference)
 */
export interface BodyweightEntry {
  id: string;       // UUID
  date: string;     // ISO 8601 timestamp
  weight: number;   // in kg
}
