// Initialize keyboard behavior for the Capacitor iOS app.
// KeyboardResize.Body: the <body> resizes when the keyboard appears, pushing
// content up. Correct for a scrollable log form. The alternative (KeyboardResize.Native)
// resizes the WKWebView itself, which causes jank with the fixed-position bottom nav.
// setScroll({ isDisabled: false }): allows scrolling while the keyboard is visible,
// so SetRow inputs at the bottom of the form remain reachable.

export async function initKeyboard() {
  if (typeof window === "undefined") return;
  try {
    const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setScroll({ isDisabled: false });
  } catch {}
}
