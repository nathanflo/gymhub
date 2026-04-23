// Initialize the native status bar for the Capacitor iOS app.
//
// Style.Dark = "Light text for dark backgrounds" → white/light status bar icons.
// Style.Light = "Dark text for light backgrounds" → dark/black status bar icons.
// The naming is counterintuitive — "Dark" means "for dark backgrounds", not "dark icons".
// FloForm uses bg-neutral-900/bg-neutral-950 everywhere → Style.Dark (white icons) is correct.
//
// overlay: true — the WKWebView fills the full screen including behind the status bar.
// The app uses viewportFit:"cover" and env(safe-area-inset-top) throughout;
// overlay: true is required so those values are correct and no layout gap appears.
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initStatusBar() {
  if (typeof window === "undefined") return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {}
}
