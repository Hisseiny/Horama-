import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  agentRules: false,
  transpilePackages: ["@horama/contrats"],
  // A build made with USE_MOCKS=1 stays on mocks at `next start`, even if the variable is not repeated.
  env: process.env.USE_MOCKS ? { USE_MOCKS: process.env.USE_MOCKS } : {},
};

export default config;
