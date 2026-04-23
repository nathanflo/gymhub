import { createClient } from "@supabase/supabase-js";

// createClient uses localStorage by default — works correctly in WKWebView/Capacitor
// (capacitor:// scheme causes document.cookie writes to fail silently, so the
// @supabase/ssr createBrowserClient is the wrong choice here).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Offline auth backup ───────────────────────────────────────────────────────
//
// localStorage-backed getSession() returns null when the access token has expired
// and the device is offline (can't reach the Supabase token refresh endpoint).
// In that case, app/page.tsx falls back to a copy of the user object stored in
// @capacitor/preferences (NSUserDefaults on iOS) under "gymhub-auth-user".
//
// We keep this copy up to date via onAuthStateChange so it always reflects the
// last known signed-in state. On deliberate sign-out the key is removed, so the
// fallback correctly shows the login screen after an explicit logout.
//
// This runs only in the browser (typeof window check) so Next.js static build
// is unaffected.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      if (session?.user) {
        await Preferences.set({
          key: "gymhub-auth-user",
          value: JSON.stringify(session.user),
        });
      } else if (event === "SIGNED_OUT") {
        await Preferences.remove({ key: "gymhub-auth-user" });
      }
    } catch {
      // Preferences not available (plain web browser) — silent fail, not critical
    }
  });
}
