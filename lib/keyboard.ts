// Initialize keyboard behavior for the Capacitor iOS app.
//
// KeyboardResize.Native — iOS natively resizes the WKWebView when the keyboard appears.
// The app uses svh units and env(safe-area-inset-*) throughout, which respond correctly
// to a resized viewport. KeyboardResize.Body (previous setting) shrank the <body> instead,
// which conflicted with the min-h-[100svh] content wrapper and left the keyboard covering
// inputs without scrolling them into view.
//
// setScroll({ isDisabled: false }) — allow scrolling while the keyboard is visible so
// inputs at the bottom of a long form remain reachable.
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";

export async function initKeyboard() {
  if (typeof window === "undefined") return;
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    await Keyboard.setScroll({ isDisabled: false });
  } catch {}
}
