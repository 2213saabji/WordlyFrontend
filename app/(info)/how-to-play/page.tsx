import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Eyebrow } from "@/components/ContentPage";
import { INFINITE_TIERS_ENABLED } from "@/lib/flags";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/how-to-play";

export const metadata: Metadata = pageMetadata({
  title: "How to Play — Rules & Tile Colors",
  description: INFINITE_TIERS_ENABLED
    ? "Learn how to play GuessWord: guess the five-letter word in six tries, what the green, amber, and gray tiles mean, how Daily and Groups work, and how to climb the Infinite tiers."
    : "Learn how to play GuessWord: guess the five-letter word in six tries, what the green, amber, and gray tiles mean, and how Daily, Infinite, and Groups modes work.",
  path: PATH,
});

const STREAK_STEP = INFINITE_TIERS_ENABLED
  ? "Solve the daily word to grow your streak, or play Infinite mode to earn points and climb eight tiers, from Stone to Diamond."
  : "Solve the daily word to grow your streak, or play Infinite mode for unlimited practice that doesn't affect your stats.";

// HowTo mirrors the steps this page actually shows, giving answer engines a
// clean, quotable "how do you play" answer.
const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to play GuessWord",
  description: "Guess the secret five-letter word in six tries using color-coded tile feedback.",
  url: `${SITE_URL}${PATH}`,
  totalTime: "PT5M",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Enter a guess",
      text: "Type any real five-letter word and submit it. You have six tries to find the secret word.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Read the tile colors",
      text: "Green means the letter is in the word and in the right spot. Amber means the letter is in the word but in a different spot. Gray means the letter is not in the word.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Narrow it down",
      text: "Use the feedback to choose your next guess. After four guesses without solving it, a hint with a short clue becomes available.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Keep your streak",
      text: STREAK_STEP,
    },
  ],
};

type TileTone = "correct" | "present" | "plain" | "dimmed";

const TILE_STYLE: Record<TileTone, string> = {
  correct: "bg-[#5f8f49] text-foreground",
  present: "bg-[#c28c3e] text-background",
  plain: "bg-white/8 text-foreground",
  dimmed: "border-2 border-white/10 bg-white/3 text-[#6f6376]",
};

function TileRow({ letters, tones }: { letters: string; tones: TileTone[] }) {
  return (
    <div className="flex gap-1.5">
      {letters.split("").map((letter, i) => (
        <span
          key={i}
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl font-bold ${TILE_STYLE[tones[i]]}`}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

function ColorCard({
  letters,
  tones,
  name,
  nameColor,
  description,
}: {
  letters: string;
  tones: TileTone[];
  name: string;
  nameColor: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4.5 rounded-3xl border border-white/8 bg-white/4 p-6.5">
      <TileRow letters={letters} tones={tones} />
      <div className="flex flex-col gap-1.5">
        <h2 className={`text-base font-semibold ${nameColor}`}>{name}</h2>
        <span className="text-[14.5px] leading-relaxed text-[#c9bfcc]">{description}</span>
      </div>
    </div>
  );
}

// Mirrors the backend's current tier rules — keep in step with the FAQ.
const TIER_STEPS = [
  {
    heading: "Meet your daily targets",
    body: "Each tier asks for a set number of minutes played and rounds completed each day. Meet both and the day counts.",
  },
  {
    heading: "Climb the tiers",
    body: "Count enough days in a row and you move up a tier at midnight IST. Eight tiers run from Stone to Diamond.",
  },
  {
    heading: "Hold your place",
    body: "A missed day resets your count. A 3rd miss within your tier's window — 7 days in the lower tiers, up to 30 in Diamond — drops you a tier. Hints are off from Copper up.",
  },
];

const WAYS_TO_PLAY = [
  {
    heading: "Daily",
    body: "One word for everyone, released at midnight. Solving it keeps your streak going.",
  },
  INFINITE_TIERS_ENABLED
    ? {
        heading: "Infinite",
        body: "A new word as soon as you finish. Solved words earn points on your tier's leaderboard; meet your daily targets to climb from Stone to Diamond.",
      }
    : {
        heading: "Infinite",
        body: "A new word as soon as you finish. Practice as long as you like; it doesn't touch your streak.",
      },
  {
    heading: "Groups",
    body: "Share an eight-character invite code. Everyone plays the daily word and ranks on a weekly board.",
  },
];

export default function HowToPlayPage() {
  return (
    <ContentPage
      title={
        <>
          Find the word in <strong className="font-bold">six tries.</strong>
        </>
      }
      subtitle="Every guess must be a real five-letter word. After each guess the tiles change color to show how close you are."
    >
      <JsonLd data={[howToJsonLd, breadcrumbJsonLd("How to Play", PATH)]} />
      <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-3">
        <ColorCard
          letters="CRANE"
          tones={["correct", "plain", "plain", "plain", "plain"]}
          name="Green"
          nameColor="text-[#7fb069]"
          description="C is in the word and in the right spot."
        />
        <ColorCard
          letters="PLANT"
          tones={["plain", "plain", "present", "plain", "plain"]}
          name="Amber"
          nameColor="text-[#e0a85a]"
          description="A is in the word, but in a different spot."
        />
        <ColorCard
          letters="MOUSE"
          tones={["plain", "dimmed", "plain", "plain", "plain"]}
          name="Gray"
          nameColor="text-[#c9bfcc]"
          description="O is not in the word. Its key dims on the keyboard."
        />
      </div>

      <div className="flex flex-col gap-5">
        <Eyebrow>Ways to play</Eyebrow>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-white/8 bg-white/8 sm:grid-cols-3">
          {WAYS_TO_PLAY.map((way) => (
            <div key={way.heading} className="flex flex-col gap-2.5 bg-background p-7">
              <h2 className="text-lg font-semibold">{way.heading}</h2>
              <span className="text-[14.5px] leading-relaxed text-[#c9bfcc]">{way.body}</span>
            </div>
          ))}
        </div>
      </div>

      {INFINITE_TIERS_ENABLED && (
        <div className="flex flex-col gap-5">
          <Eyebrow>Infinite tiers</Eyebrow>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {TIER_STEPS.map((step) => (
              <div key={step.heading} className="flex flex-col gap-2.5 border-t border-white/10 pt-5.5">
                <h2 className="text-lg font-semibold">{step.heading}</h2>
                <span className="text-[14.5px] leading-relaxed text-[#c9bfcc]">{step.body}</span>
              </div>
            ))}
          </div>
          <span className="text-[14.5px] text-[#c9bfcc]">
            See the current rankings on the{" "}
            <Link href="/leaderboard/infinite" className="text-accent underline hover:no-underline">
              Infinite leaderboard
            </Link>
            .
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-accent/28 bg-accent/8 p-7">
        <div className="flex flex-1 flex-col gap-1.5 basis-70">
          <span className="text-lg font-semibold">Ready for today&apos;s word?</span>
          <span className="text-[14.5px] text-[#c9bfcc]">Your first guess is the hardest. Try a word with common vowels.</span>
        </div>
        <Link
          href="/"
          className="whitespace-nowrap rounded-2xl bg-accent px-6 py-3.75 text-[15px] font-bold text-background transition-transform duration-150 hover:-translate-y-0.5"
        >
          Play Daily
        </Link>
      </div>
    </ContentPage>
  );
}
