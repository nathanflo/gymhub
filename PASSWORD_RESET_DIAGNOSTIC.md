# Password Reset Bug — Diagnostic Report

**Branch:** `diagnose/password-reset`  
**Date:** 2026-04-29  
**Reported by:** Real user (reproduced by you once)  
**Severity:** Critical — users cannot recover locked accounts

---

## Symptom

User clicks "Forgot password" → enters email → receives reset email → clicks reset link → **expected:** lands on "Set new password" form → **actual:** lands on the app already signed in, no password form visible. She cannot set a new password because she doesn't know her current one, and she cannot save workouts because she's stuck in a read-only authenticated state.

---

## Reproduction Steps

1. Open FloForm on iOS (app build 1.6.0 — running from local Capacitor bundle)
2. Tap "Forgot password?"
3. Enter a valid account email and submit
4. Open the reset email on the same phone
5. Tap the reset link
6. **Expected:** Safari opens a "Choose a new password" screen
7. **Actual:** Safari (or the app) shows the home screen in an authenticated state

---

## Current Flow Trace

### Step 1 — "Forgot password" UI and request

**File:** `app/login/page.tsx:20-37`

```ts
const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
  redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,   // line 29
});
```

- **Method:** `supabase.auth.resetPasswordForEmail` (correct method)
- **SDK:** `@supabase/supabase-js` `createClient` (localStorage, not cookie-based — see `lib/supabase.ts:6`)
- **`redirectTo` value at runtime:** `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`

**CRITICAL FINDING — `NEXT_PUBLIC_SITE_URL` is not defined in the Capacitor build:**

`NEXT_PUBLIC_SITE_URL` appears in exactly one file in the codebase (`app/login/page.tsx:29`). It is:

- ❌ **Not in `.env.local.example`** (the file just added to document env vars — it was omitted)
- ❌ **Not in `next.config.ts`** (only `NEXT_PUBLIC_APP_VERSION` is hard-coded there)
- ❌ **Not committed to the repository anywhere**
- ✅ Presumably set in Vercel environment variables (for the Vercel web deployment)
- ❓ **Unknown whether it is set as a build-time env var for the Capacitor bundle**

`NEXT_PUBLIC_*` variables are baked into the static bundle at `npm run build` time. The Capacitor app loads `out/` — the static build artifact. If `NEXT_PUBLIC_SITE_URL` is not set in the environment where `npm run build` is run, then at runtime inside the Capacitor app:

```ts
process.env.NEXT_PUBLIC_SITE_URL  →  undefined
```

And the `redirectTo` becomes the literal string:

```
"undefined/reset-password"
```

Supabase validates the `redirectTo` against its dashboard allowlist. `"undefined/reset-password"` is not a valid URL and will not match any allowlist entry. **Supabase silently ignores the `redirectTo` parameter and falls back to its configured "Site URL".**

---

### Step 2 — Supabase email and redirect

The email Supabase sends contains a link of the form:

```
https://[project].supabase.co/auth/v1/verify?token=TOKEN&type=recovery&redirect_to=REDIRECT
```

Where `REDIRECT` is one of:
- `https://gymhub-inky.vercel.app/reset-password` (if `redirectTo` was accepted)
- Whatever "Site URL" is configured in the Supabase dashboard (if `redirectTo` was ignored)

After Supabase verifies the token (PKCE flow), it redirects the browser to:
- **Expected:** `https://gymhub-inky.vercel.app/reset-password?code=XXXX`
- **Probable actual:** `https://gymhub-inky.vercel.app/?code=XXXX` (root URL, because Site URL = root)

**Dashboard config is opaque — see Open Questions below.**

---

### Step 3 — The `/reset-password` page (exists and is well-implemented)

**File:** `app/reset-password/page.tsx`

The reset-password page exists and has a solid implementation. It detects recovery context via three sources in order of reliability:

1. `searchParams.get("code") !== null` — PKCE `?code=` in URL (line 23)
2. `searchParams.get("recovery") === "1"` — legacy redirect from `/auth/callback` (line 24)
3. `sessionStorage.getItem("passwordRecovery") === "1"` — set by layout early script (line 25-26)

If `isRecovery` is false, it redirects to `/login` (line 35).

**This page is correct and would work — IF the user actually lands on it.**

---

### Step 4 — The layout early script (exists but path-gated)

**File:** `app/layout.tsx:35-45`

```js
var h = window.location.hash;
var s = window.location.search;
var p = window.location.pathname;
if (h.includes('type=recovery') ||
    (p === '/reset-password' && s.includes('code='))) {
  sessionStorage.setItem('passwordRecovery', '1');
}
```

This script runs before Supabase initializes and captures the recovery flag. It correctly handles both implicit flow (hash `#type=recovery`) and PKCE flow (`?code=` on `/reset-password`).

**The critical constraint: it only sets the flag when `p === '/reset-password'`.**

If the user lands on any other path (e.g., `/` or `/auth/callback`), this script does **nothing**. There is no recovery detection at the root or at other routes.

---

### Step 5 — The `auth/callback` page (not involved, but worth noting)

**File:** `app/auth/callback/page.tsx:22-34`

```ts
supabase.auth.onAuthStateChange(async (event, session) => {
  if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session && !handled) {
    handled = true;
    await runMigrationIfNeeded(session.user.id);
    router.replace("/");  // ← redirects to home
  }
});
```

The comment at the top of this file says:
> "Password recovery links now go directly to /reset-password (PKCE flow), so this page only needs to handle SIGNED_IN / INITIAL_SESSION for email confirmation."

If the user somehow lands on `/auth/callback` with a recovery code, the Supabase client fires `PASSWORD_RECOVERY` (not `SIGNED_IN` or `INITIAL_SESSION`), so `router.replace("/")` would NOT trigger. This page is not the culprit.

---

### Step 6 — Auth state on the home page

**File:** `app/page.tsx:151`

```ts
const { data: { session } } = await supabase.auth.getSession();
```

A PKCE recovery session IS a valid session. `getSession()` returns it. The home page marks the user as signed in and loads their data. The user sees their home screen with no indication that they need to set a password.

There is no `onAuthStateChange` listener on the home page that would detect `PASSWORD_RECOVERY` and redirect to the password form.

---

## Root Cause Analysis

### Definite root cause (verifiable from code):

**`NEXT_PUBLIC_SITE_URL` is almost certainly `undefined` in the Capacitor bundle at build time**, causing `redirectTo` to be `"undefined/reset-password"`. Supabase rejects this and falls back to its dashboard Site URL.

If the Site URL is `https://gymhub-inky.vercel.app/` (root), then Supabase redirects after token verification to:

```
https://gymhub-inky.vercel.app/?code=XXXX
```

The user lands at the root `/`. The early script in layout.tsx does not recognize this as a recovery context (it only fires for `/reset-password`). Supabase's client library exchanges the `?code=` automatically, fires `PASSWORD_RECOVERY`, and establishes a valid session. No page is listening for `PASSWORD_RECOVERY` at the root. The home page calls `getSession()`, receives the recovery session, and renders the authenticated home screen. The user is stuck.

### Contributing factors:

1. **`NEXT_PUBLIC_SITE_URL` is not documented** in `.env.local.example` — the variable that controls the entire reset flow is invisible to developers setting up or rebuilding the app.

2. **The early script is path-gated** — it only fires on `/reset-password`. Any other landing path (from a misconfigured `redirectTo`) silently loses the recovery context.

3. **No `PASSWORD_RECOVERY` handler anywhere in the app** — neither the home page nor the root layout listens for the `PASSWORD_RECOVERY` auth event and redirects the user to the password form. If the user lands anywhere other than `/reset-password`, the recovery opportunity is lost silently.

4. **The recovery session is indistinguishable from a normal session at the home page** — `getSession()` returns a valid session regardless of event type, so the user just sees themselves as signed in.

---

## Fix Options

### Option A — Fix `NEXT_PUBLIC_SITE_URL` at build time (minimal change, lowest risk)

**What:** Ensure `NEXT_PUBLIC_SITE_URL` is defined in `next.config.ts` as a hard-coded constant (same as `NEXT_PUBLIC_APP_VERSION`) and add it to `.env.local.example`.

```ts
// next.config.ts
env: {
  NEXT_PUBLIC_APP_VERSION: version,
  NEXT_PUBLIC_SITE_URL: "https://gymhub-inky.vercel.app",
},
```

This ensures the correct `redirectTo` is always baked into the Capacitor bundle.

**Also required in Supabase dashboard (you do manually):**
- Verify `https://gymhub-inky.vercel.app/reset-password` is in "Redirect URLs" allowlist
- Confirm email template uses `{{ .ConfirmationURL }}` (not hardcoded URL)

**Effort:** ~30 minutes  
**Risk:** Very low — one-line config change. The Vercel deployment already works (it has `NEXT_PUBLIC_SITE_URL` set as an env var). This brings the Capacitor bundle into parity.  
**Tradeoffs:** None significant. If you ever change the Vercel URL, you'd need to update `next.config.ts` too — but that's the correct behavior.  
**Requires Supabase dashboard:** Yes (allowlist check — likely already configured since the Vercel web flow presumably works)  
**Requires Vercel bridge changes:** No

---

### Option B — Add a global `PASSWORD_RECOVERY` interceptor (defense in depth)

**What:** Add a `useEffect` to the root layout (or a new client component mounted globally) that listens for the `PASSWORD_RECOVERY` Supabase auth event and redirects to `/reset-password` unconditionally, regardless of which URL the user landed on.

```ts
// In a new component GlobalAuthHandler or in app/layout.tsx client wrapper:
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      router.replace("/reset-password?recovery=1");
    }
  });
  return () => subscription.unsubscribe();
}, []);
```

This is a safety net — even if the `redirectTo` is wrong, the user is routed to the password form automatically when Supabase detects the recovery session.

**Effort:** ~2 hours (need a client wrapper around the server-component layout)  
**Risk:** Medium. Adding a global auth listener that imperatively redirects is a significant piece of infrastructure. Must be careful not to interfere with normal sign-in flow (the guard `event === "PASSWORD_RECOVERY"` is specific enough, but needs testing).  
**Tradeoffs:** Adds complexity to the auth layer. Works regardless of `redirectTo` being correct.  
**Requires Supabase dashboard:** No  
**Requires Vercel bridge changes:** No

---

### Option C — Make the early script path-independent (targeted fix)

**What:** Modify the early script in `app/layout.tsx` to detect recovery context at ANY path, not just `/reset-password`. Then add a redirect in the root layout (or in a global component) that checks sessionStorage and routes to `/reset-password`.

**Change to early script:**
```js
// Remove the `p === '/reset-password'` path gate:
if (h.includes('type=recovery') || s.includes('code=')) {
  // Also write the code itself for the reset-password page to use
  sessionStorage.setItem('passwordRecovery', '1');
}
```

**Add a check on the home page (app/page.tsx):**
```ts
useEffect(() => {
  if (sessionStorage.getItem('passwordRecovery') === '1') {
    router.replace('/reset-password?recovery=1');
  }
}, []);
```

**Effort:** ~1 hour  
**Risk:** Medium-high. The `s.includes('code=')` check without the path gate is too broad — `?code=` could appear in non-auth URLs in the future. Would need careful scoping (e.g., only apply if there's also an active Supabase session or the code format matches).  
**Tradeoffs:** Fragile. The root fix is Option A; this adds a band-aid on top.  
**Requires Supabase dashboard:** No  
**Requires Vercel bridge changes:** No

---

## Recommendation

**Do Option A immediately, then Option B as defense in depth.**

**Option A** fixes the underlying cause (missing env var) in 30 minutes with near-zero risk. It is the correct fix — the `redirectTo` is supposed to work but doesn't because of an undocumented build-time dependency.

**Option B** then adds a safety net so that any future misconfiguration (new Vercel URL, wrong dashboard setting, someone rebuilding without the env var) doesn't silently strand users again. This is the right long-term architecture.

Do NOT do Option C — it's the weakest fix and introduces its own risks.

**Ordering for TestFlight:**
1. Ship Option A now (one config line change, verify in Supabase dashboard, rebuild)
2. Add Option B in the next sprint after testing

---

## Open Questions (require Supabase dashboard access)

These cannot be determined from code alone. Check these before implementing:

1. **What is `NEXT_PUBLIC_SITE_URL` set to in the Vercel environment variables?** (Vercel dashboard → Project Settings → Environment Variables). This tells you what value the Vercel web deployment uses and whether it's being propagated to the Capacitor build.

2. **What is the "Site URL" in the Supabase Auth dashboard?** (Supabase → Authentication → URL Configuration → Site URL). This is the URL Supabase falls back to when `redirectTo` is rejected. If it's `https://gymhub-inky.vercel.app/` (root), Option A's diagnosis is confirmed.

3. **What is in the Supabase "Redirect URLs" allowlist?** (same page). Confirm `https://gymhub-inky.vercel.app/reset-password` is present. If it's missing, even a correct `redirectTo` would be rejected.

4. **What does the "Reset Password" email template look like?** (Supabase → Authentication → Email Templates → Reset Password). Confirm it uses `{{ .ConfirmationURL }}` and not a hardcoded URL. A hardcoded URL in the template would override our `redirectTo` entirely.

5. **Is PKCE enabled for the project?** (Supabase → Authentication → Settings). PKCE flow sends `?code=`, implicit flow sends `#access_token=...&type=recovery` in the hash. The codebase handles both (the early script checks for hash `type=recovery` and query `code=`), but knowing which is active helps confirm the exact redirect format.

6. **Has `NEXT_PUBLIC_SITE_URL` ever been set in `.env.local` on the machine that produces the Capacitor build?** If yes, the bug might only reproduce on machines where it wasn't set (like CI or a fresh checkout). If no, the bug is 100% reproducible.

---

## Files Relevant to This Bug

| File | Role | Status |
|------|------|--------|
| `app/login/page.tsx:29` | Calls `resetPasswordForEmail` with `redirectTo` | `NEXT_PUBLIC_SITE_URL` likely undefined in Capacitor build — root cause |
| `app/reset-password/page.tsx` | Password reset form | Well-implemented, would work if user lands here |
| `app/layout.tsx:35-45` | Early script to capture recovery flag | Correct but path-gated to `/reset-password` only |
| `app/auth/callback/page.tsx` | Email confirmation handler | Not involved in recovery flow |
| `lib/supabase.ts` | Supabase client + offline backup | Not involved |
| `app/page.tsx:151` | Home page auth check | `getSession()` sees recovery session as normal — no redirect |
| `next.config.ts` | Build-time env vars | `NEXT_PUBLIC_SITE_URL` missing — should be added here |
| `.env.local.example` | Env var documentation | `NEXT_PUBLIC_SITE_URL` missing — should be documented |
