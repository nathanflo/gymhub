/**
 * Builds a mailto: URL for the FloForm support address.
 * Pre-fills the subject and a footer with the app version and a short user ID
 * so support requests arrive with useful context automatically.
 *
 * The three-dash separator (---) is a widely-understood "signature delimiter"
 * that hints to the user that everything below it is meta-info they can trim.
 */
export function buildSupportMailto(userId?: string): string {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";
  const subject = encodeURIComponent("FloForm Support");
  const userIdPrefix = userId ? userId.slice(0, 8) : "guest";
  const body = encodeURIComponent(
    `\n\n\n---\nFloForm ${version}\nUser: ${userIdPrefix}`
  );
  return `mailto:hello@floform.fit?subject=${subject}&body=${body}`;
}
