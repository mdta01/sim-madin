import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Force type errors to fail the build in CI/production.
    // Before deploying, run `npm run typecheck` to ensure 0 errors.
    ignoreBuildErrors: false,
  },
  // ESLint config is not part of NextConfig type — `next lint` is the
  // separate entry point. Run `npm run lint` to enforce rules in CI.
  // React StrictMode helps detect side-effect bugs in development
  // (double-invoke of effects, deprecated lifecycle warnings, etc.).
  // The performance cost is negligible in production builds.
  reactStrictMode: true,
};

export default nextConfig;
