import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` is for self-hosting / the dev sandbox only.
  // On Vercel, its own build pipeline is used and standalone must be off.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
