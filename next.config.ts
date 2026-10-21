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
  // Bundle Prisma SQLite DB for serverless reads (copied to /tmp at runtime)
  outputFileTracingIncludes: {
    "/**": ["./prisma/**/*", "./node_modules/.prisma/**/*"],
  },
};

export default nextConfig;
