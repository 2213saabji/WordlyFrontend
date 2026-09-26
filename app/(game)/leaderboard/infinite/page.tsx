import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicTierBoard from "@/components/PublicTierBoard";
import { INFINITE_TIERS_ENABLED } from "@/lib/flags";

// The one public (no-login) Infinite surface. The board itself is fetched in
// the browser from the backend's public endpoints (see
// getPublicInfiniteLeaderboard) — they need to allow unauthenticated reads.
export const metadata: Metadata = {
  title: "Infinite Leaderboard",
  description:
    "The GuessWord Infinite leaderboard: eight tiers from Stone to Diamond, ranked by points. Play daily, qualify day after day, and climb.",
  alternates: { canonical: "/leaderboard/infinite" },
};

export default function InfiniteLeaderboardPage() {
  if (!INFINITE_TIERS_ENABLED) notFound();
  return <PublicTierBoard />;
}
