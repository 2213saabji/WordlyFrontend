import type { Metadata } from "next";
import GameApp from "../GameApp";

// The signed-in app. Per-player and client-rendered, so kept out of search
// results (and the sitemap) — "/" is the public page crawlers index.
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function SignedInHomePage() {
  return <GameApp />;
}
