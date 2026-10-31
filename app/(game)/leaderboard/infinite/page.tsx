import type { Metadata } from "next";
import Link from "next/link";
import AdSenseScript from "@/components/AdSenseScript";
import PublicTierBoard from "@/components/PublicTierBoard";
import { getPublicInfiniteLeaderboard, getPublicInfiniteTiers } from "@/lib/api/infinite-tiers";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { TIER_NUMBERS, type InfiniteLeaderboardResponse, type TierNumber } from "@/types";

const PATH = "/leaderboard/infinite";
// The board's page size — a first page of any other size would make its
// "load more" (page 2 at this size) skip or repeat players.
const PAGE_SIZE = 20;

// Every tier's first page is fetched here: the starting tier's is in the
// page's HTML rather than a loader — that's what search engines index — and
// the rest make switching tier instant. Refreshed at most every 5 minutes;
// the browser then refetches the tier it shows anyway.
export const revalidate = 300;

// The one public (no-login) Infinite surface, built on the backend's public
// endpoints (see getPublicInfiniteLeaderboard) — they need to allow
// unauthenticated reads.
export const metadata: Metadata = pageMetadata({
  title: "Infinite Leaderboard — Tier Rankings",
  description:
    "The GuessWord Infinite leaderboard: eight tiers from Stone to Diamond, ranked by points. Play unlimited word rounds, meet your daily targets, and climb.",
  path: PATH,
});

export default async function InfiniteLeaderboardPage() {
  // A backend that's down or slow must not fail the build or the page: a
  // tier whose fetch failed starts as a loader and the browser fetches it.
  const [boards, initialTiers] = await Promise.all([
    Promise.all(
      TIER_NUMBERS.map((tier) => getPublicInfiniteLeaderboard({ tier, page: 1, limit: PAGE_SIZE }).catch(() => null)),
    ),
    getPublicInfiniteTiers().catch(() => null),
  ]);
  const initialBoards: Partial<Record<TierNumber, InfiniteLeaderboardResponse>> = {};
  boards.forEach((board, i) => {
    if (board) initialBoards[TIER_NUMBERS[i]] = board;
  });

  return (
    <>
      <AdSenseScript />
      <JsonLd data={breadcrumbJsonLd("Infinite Leaderboard", PATH)} />
      <PublicTierBoard initialBoards={initialBoards} initialTiers={initialTiers} />
      <Intro />
    </>
  );
}

// More server-rendered text about the board, for visitors and crawlers alike.
// Headings start at <h2>: the board has the <h1>.
function Intro() {
  return (
    <section
      aria-labelledby="about-infinite-tiers"
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-5 pb-14 pt-4 md:px-8"
    >
      <h2 id="about-infinite-tiers" className="text-lg font-semibold">
        How the Infinite leaderboard works
      </h2>
      <p className="max-w-160 text-[14.5px] leading-relaxed text-[#c9bfcc]">
        Infinite mode gives you unlimited five-letter words, and every solved word earns points. Players are split
        into eight tiers — Stone, Iron, Copper, Bronze, Silver, Gold, Platinum and Diamond — each with its own
        leaderboard. Meet your tier&apos;s daily targets for enough days in a row to move up; miss too many and you
        drop down. Tier moves happen at midnight IST.
      </p>
      <p className="text-[14.5px] text-[#c9bfcc]">
        Read the full rules in{" "}
        <Link href="/how-to-play" className="text-accent underline hover:no-underline">
          how to play
        </Link>{" "}
        and the{" "}
        <Link href="/faq" className="text-accent underline hover:no-underline">
          FAQ
        </Link>
        .
      </p>
    </section>
  );
}
