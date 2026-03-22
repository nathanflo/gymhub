import { createBrowserClient } from "@supabase/ssr";

function cookieStorage() {
  const ttl = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toUTCString();
  };
  const secure = () =>
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  return {
    getItem(key: string): string | null {
      if (typeof document === "undefined") return null;
      const k = encodeURIComponent(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = document.cookie.match(new RegExp(`(?:^|; )${k}=([^;]*)`));
      return m ? decodeURIComponent(m[1]) : null;
    },
    setItem(key: string, value: string): void {
      if (typeof document === "undefined") return;
      document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; expires=${ttl()}; path=/${secure()}; SameSite=Lax`;
    },
    removeItem(key: string): void {
      if (typeof document === "undefined") return;
      document.cookie = `${encodeURIComponent(key)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${secure()}; SameSite=Lax`;
    },
  };
}

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: "implicit",
      storage: cookieStorage(),
    },
  }
);
