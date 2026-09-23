import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off so dev matches prod: on by default, Strict Mode deliberately
  // double-invokes every effect once on mount (mount -> cleanup -> mount) as
  // a dev-only diagnostic for missing cleanup — harmless, but it doubles
  // every effect-driven API call in `next dev`, which reads as a bug when
  // watching the network tab.
  reactStrictMode: false,
};

export default nextConfig;
