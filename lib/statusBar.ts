// Initialize the native status bar for the Capacitor iOS app.
// Style.Light = white icons (time, battery, signal) — correct for a dark UI (bg-neutral-950).
// overlay: false — status bar has its own space; the webview does not render beneath it.
// This is consistent with the layout's existing env(safe-area-inset-top) padding.

export async function initStatusBar() {
  if (typeof window === "undefined") return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch {}
}
