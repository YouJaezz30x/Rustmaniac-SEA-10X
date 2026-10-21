import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "files.catbox.moe",
      },
    ],
  },
};

export default nextConfig;
