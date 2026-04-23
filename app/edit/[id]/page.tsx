/**
 * Server wrapper for static export compatibility.
 *
 * generateStaticParams returns a placeholder so Next.js accepts the route
 * with output: export. Real session/workout IDs are unknown at build time —
 * the client reads the actual ID from useParams() at runtime.
 *
 * dynamicParams = false: only pre-rendered paths are served statically.
 */
import EditClient from "./EditClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export const dynamicParams = false;

export default function EditPage() {
  return <EditClient />;
}
