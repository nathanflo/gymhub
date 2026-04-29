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
  },
};

export default nextConfig;
