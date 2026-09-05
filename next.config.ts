import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "ws"],
  agentRules: false,
};

export default nextConfig;
