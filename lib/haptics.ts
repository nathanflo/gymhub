// Thin wrapper around @capacitor/haptics.
// All functions are async, no-op silently on web or if the plugin is unavailable.
// Dynamic imports defer the plugin bundle until first use.

export async function hapticLight() {
  if (typeof window === "undefined") return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function hapticMedium() {
  if (typeof window === "undefined") return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function hapticHeavy() {
  if (typeof window === "undefined") return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {}
}

export async function hapticSuccess() {
  if (typeof window === "undefined") return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}

export async function hapticWarning() {
  if (typeof window === "undefined") return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {}
}

export async function hapticSelection() {
  if (typeof window === "undefined") return;
  try {
    const { Haptics } = await import("@capacitor/haptics");
    await Haptics.selectionChanged();
  } catch {}
}
