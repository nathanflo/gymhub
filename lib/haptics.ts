// Static imports — module is loaded once at bundle time.
// Each function is synchronous from the call site (fire-and-forget).
// The Capacitor bridge handles the native async call internally.
// .catch(() => {}) suppresses unhandled rejections on web/unsupported devices.
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export function hapticLight() {
  if (typeof window === "undefined") return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function hapticMedium() {
  if (typeof window === "undefined") return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export function hapticHeavy() {
  if (typeof window === "undefined") return;
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
}

export function hapticSuccess() {
  if (typeof window === "undefined") return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export function hapticWarning() {
  if (typeof window === "undefined") return;
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}

export function hapticSelection() {
  if (typeof window === "undefined") return;
  Haptics.selectionChanged().catch(() => {});
}
