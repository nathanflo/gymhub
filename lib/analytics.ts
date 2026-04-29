// PostHog analytics wrapper — single import boundary for the entire app.
//
// All components import from here, never from posthog-js directly.
// Events fired before initAnalytics() completes are buffered and flushed on init.
// No-op if NEXT_PUBLIC_POSTHOG_KEY is not set (e.g. local dev without a key).
import posthog from "posthog-js";

export type EventName =
  | "app_launched"
  | "auth_signin"
  | "auth_signout"
  | "milestone_dismissed"
  | "milestone_shown"
  | "performance_exercise_drilldown"
  | "performance_opened"
  | "performance_range_changed"
  | "pr_hit"
  | "program_day_launched"
  | "session_completed"
  | "session_saved"
  | "session_started"
  | "share_completed"
  | "share_opened"
  | "template_launched"
  | "workout_resumed";

let initialized = false;
const eventBuffer: Array<[EventName, Record<string, unknown>?]> = [];
const identifyBuffer: Array<[string, Record<string, unknown>?]> = [];

export function initAnalytics() {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false,
    persistence: "localStorage",
  });
  initialized = true;
  // Flush queued identifies and events in order
  for (const [id, props] of identifyBuffer) posthog.identify(id, props);
  identifyBuffer.length = 0;
  for (const [event, props] of eventBuffer) posthog.capture(event, props);
  eventBuffer.length = 0;
  track("app_launched");
}

export function identify(userId: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!initialized) { identifyBuffer.push([userId, props]); return; }
  try { posthog.identify(userId, props); } catch {}
}

export function track(event: EventName, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!initialized) { eventBuffer.push([event, properties]); return; }
  try { posthog.capture(event, properties); } catch {}
}

export function reset() {
  if (!initialized) return;
  try { posthog.reset(); } catch {}
}
