import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lifesync/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;

