import type { Metadata } from "next";
import Link from "next/link";
import FaqAccordion, { type FaqItem } from "@/components/FaqAccordion";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/faq";

export const metadata: Metadata = pageMetadata({
  title: "FAQ — Daily Word, Streaks, Groups & Hints",
  description:
    "Answers to common GuessWord questions: when the daily word changes, how streaks and leaderboards work, Infinite mode, hints, groups, and playing on mobile.",
  path: PATH,
});

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
  {
    question: "Does Infinite mode affect my streak?",
    answer: "No — Infinite mode is just for practice. It never touches your stats, streak, or any leaderboard.",
  },
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
    answer: "Yes, GuessWord is completely free to play, with no download required.",
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
    answer:
      "Yes — after four guesses without solving the word, a hint becomes available with a short clue. It never reveals the word itself.",
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
