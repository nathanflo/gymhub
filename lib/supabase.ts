import { createClient } from "@supabase/supabase-js";

// createClient (from @supabase/supabase-js) uses localStorage by default in
// browser environments. This works correctly in WKWebView / Capacitor local
// bundle, where the capacitor:// scheme causes document.cookie writes to fail
// silently. @supabase/ssr's createBrowserClient always uses cookie storage and
// is the wrong choice for a statically exported Capacitor app with no SSR.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
