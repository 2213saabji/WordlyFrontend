import type { Metadata } from "next";
import Link from "next/link";
import FaqAccordion, { type FaqItem } from "@/components/FaqAccordion";
import { INFINITE_TIERS_ENABLED } from "@/lib/flags";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/faq";

export const metadata: Metadata = pageMetadata(
  INFINITE_TIERS_ENABLED
    ? {
        title: "FAQ — Daily Word, Streaks, Infinite Tiers & Hints",
        description:
          "Answers to common GuessWord questions: when the daily word changes, how streaks work, how Infinite tiers and the Infinite leaderboard work, hints, groups, and playing on mobile.",
        path: PATH,
      }
    : {
        title: "FAQ — Daily Word, Streaks, Groups & Hints",
        description:
          "Answers to common GuessWord questions: when the daily word changes, how streaks and leaderboards work, Infinite mode, hints, groups, and playing on mobile.",
        path: PATH,
      },
);

// Tier rules mirror the backend's current config (GET /infinite/tiers:
// 8 tiers; 3rd miss in a rolling window demotes — 30 days for Diamond and
// Platinum, 21 Gold, 14 Silver, 7 Bronze–Iron; scoring 10 + 2 per unused
// guess + 20 per qualifying day; carry-in 20%, demotion penalty 50 points;
// decay 5% (min 10) per idle day; +10 coins per solve; hints 1,000 coins in
// Copper–Diamond; one pack, 3,000 coins for ₹10). Update this copy if those
// change.
const TIER_FAQS: FaqItem[] = [
  {
    question: "Does Infinite mode affect my streak?",
    answer:
      "No — your daily streak only counts the daily word. Infinite rounds earn points on the Infinite leaderboard instead.",
  },
  {
    question: "What are Infinite tiers?",
    answer:
      "Infinite mode has eight tiers: Stone, Iron, Copper, Bronze, Silver, Gold, Platinum and Diamond. Everyone starts in Stone after their first completed Infinite round, and each tier has its own leaderboard.",
  },
  {
    question: "How do I move up a tier?",
    answer:
      "Each tier sets two daily targets: minutes played and rounds completed. Meet both and the day counts. Count enough days in a row for your tier and you move up at midnight IST.",
  },
  {
    question: "Can I drop down a tier?",
    answer:
      "Yes. Each tier lets you miss up to 2 days in a rolling window: 30 days in Diamond and Platinum, 21 in Gold, 14 in Silver, and 7 in Bronze, Copper and Iron. A 3rd miss in that window drops you one tier, and any missed day also resets your day count. Stone is the bottom tier, so you can't drop below it.",
  },
  {
    question: "What happens to my points when I change tier?",
    answer:
      "Moving up, you start the new tier with 20% of your points. Moving down, you keep 20% minus a 50-point penalty (never below 0) — for example, 900 points in Gold becomes 130 in Silver.",
  },
  {
    question: "Do I lose points if I don't play?",
    answer:
      "Yes. A day with no completed Infinite rounds costs 5% of your tier points (at least 10), taken at midnight IST. A day you play but miss your targets doesn't lose points — it only counts as a missed day.",
  },
  {
    question: "How are Infinite points scored?",
    answer:
      "A solved word earns 10 points plus 2 for every guess you didn't need, and each day you meet your targets adds a 20-point bonus. Tier leaderboards rank by points, then by days counted in the tier.",
  },
  {
    question: "Where can I see the Infinite leaderboard?",
    answer:
      "Anyone can view it at guessword.games/leaderboard/infinite, no account needed. Sign in to see your own rank and tier.",
  },
  {
    question: "What are coins?",
    answer:
      "Coins are GuessWord's in-game currency. You earn 10 coins for every word you solve, Daily or Infinite, and you can buy more: 3,000 coins for ₹10. Spend them on hints in the Copper to Diamond tiers. Coins have no cash value, can't be withdrawn or transferred, and don't expire.",
  },
];

const FAQS: FaqItem[] = [
  {
    question: "When does the daily word change?",
    answer: "At midnight UTC. The countdown on the home screen shows exactly how long is left.",
  },
  {
    question: "How do streaks work?",
    answer:
      "Solve the daily word and your streak goes up by one. Miss a day without solving it and your streak resets to zero — your best streak is saved separately, so you always know your record.",
  },
  ...(INFINITE_TIERS_ENABLED
    ? TIER_FAQS
    : [
        {
          question: "Does Infinite mode affect my streak?",
          answer: "No — Infinite mode is just for practice. It never touches your stats, streak, or any leaderboard.",
        },
      ]),
  {
    question: "How do I join a group?",
    answer: "Open Groups and enter a friend's invite code, or create your own group to get a code to share.",
  },
  {
    question: "How is the leaderboard ranked?",
    answer:
      "Daily leaderboards rank wins before losses, then by fewer guesses, then by faster time. Weekly leaderboards rank by total wins, then average guesses, then average time.",
  },
  {
    question: "Is GuessWord free?",
    answer: INFINITE_TIERS_ENABLED
      ? "Yes, GuessWord is free to play, with no download required. Buying coins for hints in the higher Infinite tiers is optional."
      : "Yes, GuessWord is completely free to play, with no download required.",
  },
  {
    question: "Do I need an account to play?",
    answer:
      "Yes — a free account (email and password, or Google sign-in) is required so your progress, streak, and group memberships are saved between visits.",
  },
  {
    question: "Can I play GuessWord on mobile?",
    answer: "Yes, GuessWord works in any modern mobile or desktop browser — no app to install.",
  },
  {
    question: "Can I share my result?",
    answer:
      "Yes — you can share your result as a row of colored squares or as a downloadable image, without ever revealing the actual word.",
  },
  {
    question: "Are hints available?",
    answer: INFINITE_TIERS_ENABLED
      ? "Yes — after four guesses without solving the word, a hint becomes available with a short clue. It never reveals the word itself. In Infinite mode, hints are free in the Stone and Iron tiers; from Copper up, a hint costs 1,000 coins."
      : "Yes — after four guesses without solving the word, a hint becomes available with a short clue. It never reveals the word itself.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <div className="mx-auto flex w-full max-w-270 px-5 py-9 md:px-14 md:py-20">
      <JsonLd data={[structuredData, breadcrumbJsonLd("FAQ", PATH)]} />
      <div className="flex w-full flex-wrap items-start gap-10 md:gap-20">
        <div className="flex flex-1 flex-col gap-4 basis-70" style={{ maxWidth: 380 }}>
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-[#9a8aa2]">FAQ</span>
          <h1 className="text-[34px] font-light leading-[1.04] tracking-[-0.03em] md:text-[54px]">
            Questions, <strong className="font-bold">answered.</strong>
          </h1>
          <p className="text-[15px] leading-relaxed text-[#c9bfcc]">
            Can&apos;t find what you need?{" "}
            <Link href="/contact" className="text-accent underline hover:no-underline">
              Send us a message.
            </Link>
          </p>
        </div>
        <div className="flex-[2_1_420px]">
          <FaqAccordion items={FAQS} />
        </div>
      </div>
    </div>
  );
}
