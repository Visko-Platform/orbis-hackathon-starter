import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  agentRules: false,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
