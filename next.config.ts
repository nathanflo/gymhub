import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    // next/image optimization is incompatible with static export.
    // Must be disabled; images served via <img> or external CDN.
    unoptimized: true,
  },
};

export default nextConfig;
