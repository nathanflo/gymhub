import { createClient, SupportedStorage } from "@supabase/supabase-js";

// Custom storage adapter backed by @capacitor/preferences (NSUserDefaults on iOS).
// NSUserDefaults is flushed synchronously before the app is suspended/killed, so
// session tokens survive WKWebView force-kills — unlike localStorage which relies
// on an async SQLite WAL that may not flush before SIGKILL.
//
// On web (Next.js dev / Vercel), @capacitor/preferences falls back to localStorage
// automatically, so this adapter is safe in all runtime contexts.
//
// The typeof window guard prevents execution during Next.js static build (SSR phase),
// where neither localStorage nor Preferences is available.
const authStorage: SupportedStorage = {
  async getItem(key: string) {
    if (typeof window === "undefined") return null;
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key });
    return value;
  },
  async setItem(key: string, value: string) {
    if (typeof window === "undefined") return;
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
  },
  async removeItem(key: string) {
    if (typeof window === "undefined") return;
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key });
  },
};

// createClient (from @supabase/supabase-js) uses localStorage by default in
// browser environments. We override auth.storage with the Preferences adapter
// so that auth tokens persist across force-kills on iOS.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: { storage: authStorage },
  }
);
