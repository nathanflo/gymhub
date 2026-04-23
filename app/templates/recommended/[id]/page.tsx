/**
 * Server wrapper for static export compatibility.
 *
 * generateStaticParams pre-renders all known recommended template IDs.
 * These IDs are static constants (not user-data-driven), so full pre-rendering
 * is possible. This is the ideal case for static export.
 *
 * dynamicParams = false: unknown IDs (shouldn't exist) return 404.
 */
import RecommendedClient from "./RecommendedClient";

export function generateStaticParams() {
  // All known recommended template IDs — these are static and known at build time.
  return [
    { id: "rec-push" },
    { id: "rec-pull" },
    { id: "rec-legs" },
    { id: "rec-fullbody" },
    { id: "rec-interval-run" },
    { id: "rec-arnold-chest-back" },
    { id: "rec-arnold-shoulders-arms" },
    { id: "rec-arnold-legs" },
    { id: "rec-arnold-advanced-chest-back" },
    { id: "rec-arnold-advanced-shoulders-arms" },
    { id: "rec-arnold-advanced-legs" },
    { id: "rec-upper-a" },
    { id: "rec-lower-a" },
    { id: "rec-upper-b" },
    { id: "rec-lower-b" },
  ];
}

export const dynamicParams = false;

export default function RecommendedTemplatePage() {
  return <RecommendedClient />;
}
