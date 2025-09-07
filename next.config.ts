import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  // Bind to localhost only
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
