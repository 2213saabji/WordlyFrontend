import type { Metadata } from "next";
import Link from "next/link";
import PublicTierBoard from "@/components/PublicTierBoard";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/leaderboard/infinite";

// The one public (no-login) Infinite surface. The board itself is fetched in
// the browser from the backend's public endpoints (see
// getPublicInfiniteLeaderboard) — they need to allow unauthenticated reads.
export const metadata: Metadata = pageMetadata({
  title: "Infinite Leaderboard — Tier Rankings",
  description:
    "The GuessWord Infinite leaderboard: eight tiers from Stone to Diamond, ranked by points. Play unlimited word rounds, meet your daily targets, and climb.",
  path: PATH,
});

export default function InfiniteLeaderboardPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Infinite Leaderboard", PATH)} />
      <PublicTierBoard />
      <Intro />
    </>
  );
}

// Server-rendered so crawlers get real text — the board above is fetched in
// the browser and starts as a loader. Headings start at <h2>: the board has
// the <h1>.
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
