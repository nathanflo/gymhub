import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require("./package.json") as { version: string };

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    // next/image optimization is incompatible with static export.
    // Must be disabled; images served via <img> or external CDN.
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    // Baked in at build time so the Capacitor static bundle always has a valid
    // redirectTo URL for password reset, regardless of runtime environment.
    // Falls back to the production domain if the env var is not set (e.g. local
    // dev or a CI build without .env.local). Override in Vercel env vars for the
    // Vercel deployment.
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://floform.fit",
  },
};

export default nextConfig;
