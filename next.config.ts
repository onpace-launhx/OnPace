import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbo: {
      // Disable turbopack for Netlify edge function compatibility
    },
  },
};

export default nextConfig;
