import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off so dev matches prod: on by default, Strict Mode deliberately
  // double-invokes every effect once on mount (mount -> cleanup -> mount) as
  // a dev-only diagnostic for missing cleanup — harmless, but it doubles
  // every effect-driven API call in `next dev`, which reads as a bug when
  // watching the network tab.
  reactStrictMode: false,
  // The service worker (public/sw.js) must never be served from a cache, or
  // browsers keep running an old copy after a deploy.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
