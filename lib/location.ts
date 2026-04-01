export type SavedLocation = {
  label: string;
  lat: number;
  lon: number;
};

export type LocationSearchResult = SavedLocation;

/**
 * Parse the city column value.
 * Returns full location data if JSON-encoded (new format), or legacy plain-string label.
 */
export function parseLocation(city: string | null): { label: string | null; lat: number | null; lon: number | null } {
  if (!city) return { label: null, lat: null, lon: null };
  try {
    const parsed = JSON.parse(city);
    if (
      parsed &&
      typeof parsed.label === "string" &&
      typeof parsed.lat === "number" &&
      typeof parsed.lon === "number"
    ) {
      return { label: parsed.label, lat: parsed.lat, lon: parsed.lon };
    }
  } catch {}
  return { label: city, lat: null, lon: null }; // legacy plain-string fallback
}

/** Encode a confirmed location for storage in the city column. */
export function stringifyLocation(loc: SavedLocation): string {
  return JSON.stringify(loc);
}

/** Search Open-Meteo geocoding API. Returns up to 5 candidate results. */
export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
  );
  const data = await res.json();
  const results: Array<{
    name: string;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
  }> = data.results ?? [];
  return results.map((r) => ({
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

function normalizeAliasKey(query: string): string {
  return query.toLowerCase().trim().replace(/[,.]/g, "").replace(/\s+/g, " ");
}

const locationAliases: Record<string, string[]> = {
  "bedford new york": ["Bedford Hills", "Katonah"],
  "bedford ny":       ["Bedford Hills", "Katonah"],
};

export function getAliasQueries(query: string): string[] {
  return locationAliases[normalizeAliasKey(query)] ?? [];
}

/**
 * Shorten a full location label for display. Stored label is never modified.
 * "Bedford, New York, United States of America" → "Bedford, New York"
 * "London, England, United Kingdom" → "London, England"
 * "Tokyo, Japan" → "Tokyo, Japan" (already short — unchanged)
 */
export function formatLocationLabel(label: string): string {
  const parts = label.split(", ");
  if (parts.length <= 2) return label;
  return parts.slice(0, 2).join(", ");
}
