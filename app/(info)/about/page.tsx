import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { BulletList, Section } from "@/components/ContentPage";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/about";

export const metadata: Metadata = pageMetadata({
  title: "About Us — A Free Daily Word Game",
  description:
    "GuessWord is a free daily word-guessing game: one five-letter word a day, six tries, an unlimited Infinite mode with eight tiers to climb, and group leaderboards — no download, no cost.",
  path: PATH,
});

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE_URL}${PATH}`,
  name: "About GuessWord",
  about: { "@id": `${SITE_URL}/#game` },
  isPartOf: { "@id": `${SITE_URL}/#website` },
};

const LOGO_TILES = [
  { char: "G", className: "bg-accent text-background" },
  { char: "U", className: "bg-white/7 text-foreground" },
  { char: "E", className: "bg-white/7 text-foreground" },
  { char: "S", className: "bg-white/7 text-foreground" },
  { char: "S", className: "bg-white/7 text-foreground" },
  { char: "W", className: "bg-accent-2 text-background" },
  { char: "O", className: "bg-white/7 text-foreground" },
  { char: "R", className: "bg-white/7 text-foreground" },
  { char: "D", className: "bg-white/7 text-foreground" },
];

const FEATURES = [
  {
    number: "01",
    heading: "One word, shared",
    body: "Everyone gets the same daily word, so there's always something to compare over lunch or in the group chat.",
  },
  {
    number: "02",
    heading: "No spoilers",
    body: "Shared results show your colored grid, never the word, so nobody's game gets ruined.",
  },
  {
    number: "03",
    heading: "Quiet by design",
    body: "No pop-ups between guesses and no countdown on your board. Play at your own pace, any time before midnight.",
  },
];

export default function AboutPage() {
  return (
    <ContentPage
      title={
        <>
          A small word game <strong className="font-bold">for every day.</strong>
        </>
      }
      subtitle="GuessWord gives you one five-letter word a day and six tries to find it. It takes a couple of minutes, and it's more fun with friends, family or coworkers playing the same word."
    >
      <JsonLd data={[aboutJsonLd, breadcrumbJsonLd("About", PATH)]} />
      <div className="flex flex-wrap gap-1.5" role="img" aria-label="GuessWord">
        {LOGO_TILES.map((tile, i) => (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-xl text-base font-bold md:h-14 md:w-14 md:text-3xl lg:h-21 lg:w-21 lg:text-[40px] ${tile.className}`}
          >
            {tile.char}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.number} className="flex flex-col gap-2.5 border-t border-white/10 pt-5.5">
            <span className="text-[13px] font-semibold text-accent">{feature.number}</span>
            <h2 className="text-[19px] font-semibold">{feature.heading}</h2>
            <span className="text-[14.5px] leading-relaxed text-[#c9bfcc]">{feature.body}</span>
          </div>
        ))}
      </div>

      <Section heading="What GuessWord is">
        <p>
          GuessWord is a browser word game built around one simple puzzle: find a secret five-letter word in six
          guesses, using coloured tiles that tell you which letters are right, which are in the wrong place and
          which aren&apos;t in the word at all. It runs on any phone, tablet or computer with a modern browser —
          there&apos;s nothing to download.
        </p>
        <p>
          Around that puzzle we&apos;ve built three ways to play. The <strong className="font-semibold text-foreground">Daily word</strong>{" "}
          is the same for everyone and changes at midnight UTC. <strong className="font-semibold text-foreground">Infinite</strong>{" "}
          gives you a new word the moment you finish the last one, with eight tiers to climb from Stone to Diamond.
          And <strong className="font-semibold text-foreground">groups</strong> turn the Daily word into a private
          competition with friends, family or coworkers.
        </p>
      </Section>

      <Section heading="Our word lists">
        <p>
          Every answer comes from lists we curate ourselves rather than a raw dictionary, so you get real, familiar
          words instead of obscure ones. The Daily list has 728 words, Infinite has 1,456, and play without an
          account draws on a separate list of 2,844 — so playing as a guest never spoils a Daily or Infinite word.
        </p>
        <p>
          When a round ends we show the word&apos;s meaning, so even a lost game teaches you something. We also
          publish what we&apos;ve learned from analysing these lists — letter frequencies, common patterns and the
          best opening words — in our{" "}
          <Link href="/guides" className="text-accent underline hover:no-underline">
            guides
          </Link>
          .
        </p>
      </Section>

      <Section heading="Fair for everyone">
        <BulletList
          items={[
            "Every guess is checked on our server, and the answer is never sent to your browser before the round ends.",
            "Leaderboards rank by results — wins, guesses and time for the Daily word; points and qualifying days in Infinite — never by how much anyone has spent.",
            "Shared results show coloured squares, never the word, so nobody's game gets spoiled.",
            "Coins are optional. They only buy hints in the higher Infinite tiers, and you earn 10 for every word you solve.",
          ]}
        />
      </Section>

      <Section heading="Who runs GuessWord">
        <p>
          GuessWord is owned, built and run by <strong className="font-semibold text-foreground">Gurpreet Singh</strong>,
          an individual developer in India. It&apos;s an independent project, not affiliated with any other word game
          or publisher. The answer lists are curated for GuessWord, and the guides are written from our own analysis of them.
        </p>
        <p>
          Questions, ideas and bug reports go straight to the person who builds the game — write to{" "}
          <a href="mailto:support@guessword.games" className="text-accent underline hover:no-underline">
            support@guessword.games
          </a>{" "}
          or use the{" "}
          <Link href="/contact" className="text-accent underline hover:no-underline">
            contact page
          </Link>
          .
        </p>
      </Section>

      <Section heading="Free to play">
        <p>
          GuessWord is free. You can play Infinite on the home page without an account; a free account adds the
          Daily word, streaks, hints, groups and the leaderboards. The game is supported by advertising — see our{" "}
          <Link href="/privacy-policy" className="text-accent underline hover:no-underline">
            privacy policy
          </Link>{" "}
          for how ads and your data are handled.
        </p>
      </Section>

      <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-white/8 bg-white/4 p-7">
        <div className="flex flex-1 flex-col gap-1.5 basis-70">
          <span className="text-lg font-semibold">Have an idea or found a bug?</span>
          <span className="text-[14.5px] text-[#c9bfcc]">We read every message.</span>
        </div>
        <Link
          href="/contact"
          className="whitespace-nowrap rounded-2xl border border-white/14 bg-white/7 px-6 py-3.75 text-[15px] font-semibold text-foreground transition-colors hover:bg-white/12"
        >
          Contact us
        </Link>
      </div>
    </ContentPage>
  );
}
