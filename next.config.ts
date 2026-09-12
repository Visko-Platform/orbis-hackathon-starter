import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  turbopack: { root: process.cwd() },
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
