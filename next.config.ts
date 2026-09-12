import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // sql.js bootstraps its Emscripten module through CommonJS globals. Keeping it
  // external lets the Node runtime load that module directly instead of Next
  // wrapping it into a server bundle where those globals are unavailable.
  serverExternalPackages: ["sql.js"],
  turbopack: { root: process.cwd() },
};

export default nextConfig;
