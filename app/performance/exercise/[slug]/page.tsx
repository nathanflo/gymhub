/**
 * Server wrapper for static export compatibility.
 *
 * generateStaticParams returns a placeholder slug so Next.js accepts the route
 * with output: export. Exercise slugs are user-data-driven (exercise names),
 * so they cannot be known at build time. The client reads the slug from
 * useParams() at runtime.
 *
 * dynamicParams = false: only pre-rendered paths are served statically.
 */
import ExerciseClient from "./ExerciseClient";

export function generateStaticParams() {
  return [{ slug: "_" }];
}

export const dynamicParams = false;

export default function ExerciseDetailPage() {
  return <ExerciseClient />;
}
