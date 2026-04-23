// Initialize the native status bar for the Capacitor iOS app.
//
// Style.Light = white status bar icons (time, battery, signal) on the dark bg-neutral-950 UI.
//
// overlay: true — the WKWebView fills the full screen including behind the status bar.
// This is required because the app uses viewportFit:"cover" and env(safe-area-inset-top)
// throughout. overlay: false would physically push the webview below the status bar,
// conflicting with the existing safe-area CSS and causing a double-inset black band at top.
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initStatusBar() {
  if (typeof window === "undefined") return;
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {}
}
