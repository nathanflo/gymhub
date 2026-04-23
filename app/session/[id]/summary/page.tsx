/**
 * Server wrapper for static export compatibility.
 *
 * generateStaticParams returns a placeholder entry so Next.js accepts the
 * route with output: export. Real session IDs are unknown at build time —
 * the placeholder page renders a client component that uses useParams() to
 * load actual data from Supabase/localStorage at runtime.
 *
 * dynamicParams = false: paths outside the pre-rendered set are NOT served.
 * In a Capacitor static bundle this means direct deep-links to session
 * summary URLs will NOT work unless routing is managed by the app shell
 * (e.g., Capacitor's server handles the 404 → fallback to index.html).
 */
import SummaryClient from "./SummaryClient";

export function generateStaticParams() {
  // One placeholder to satisfy Next.js static export requirement.
  // At runtime the client reads the real ID from useParams().
  return [{ id: "_" }];
}

export const dynamicParams = false;

export default function SummaryPage() {
  return <SummaryClient />;
}
