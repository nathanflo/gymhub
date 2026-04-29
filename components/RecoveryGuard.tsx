"use client";

// Defense-in-depth for password recovery.
//
// Supabase fires the PASSWORD_RECOVERY auth event when it exchanges a recovery
// code for a session — regardless of which URL the user landed on. This guard
// catches that event globally and redirects to /reset-password so the user always
// reaches the password form, even if the redirectTo in the email link was wrong
// (e.g. pointed at the root instead of /reset-password).
//
// This component renders nothing and is mounted once in the root layout. The
// listener is set up on mount and torn down on unmount. window.location.pathname
// is read inside the callback (not closed over at mount time) so it reflects the
// current URL when the event fires, not the URL at mount time.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RecoveryGuard() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event !== "PASSWORD_RECOVERY") return;

        // Normalize pathname — trailingSlash: true means the deployed URL may
        // have a trailing slash that wouldn't match an exact === check.
        const path = window.location.pathname.replace(/\/$/, "");
        if (path === "/reset-password") return; // already there, do nothing

        // Set the sessionStorage flag so /reset-password shows the form
        // (the page checks this as one of its three recovery indicators).
        try {
          sessionStorage.setItem("passwordRecovery", "1");
        } catch {}

        // ?recovery=1 is a second indicator the reset-password page accepts,
        // covering the case where sessionStorage is cleared between the redirect
        // and the page render.
        router.replace("/reset-password?recovery=1");
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
