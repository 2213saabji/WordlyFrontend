import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Eyebrow } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "How to Play",
  description:
    "Learn how to play GuessWord: guess the five-letter word in six tries, what the green, amber, and gray tiles mean, and how the daily word and hints work.",
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
        <span className={`text-base font-semibold ${nameColor}`}>{name}</span>
        <span className="text-[14.5px] leading-relaxed text-[#c9bfcc]">{description}</span>
      </div>
    </div>
  );
}

const WAYS_TO_PLAY = [
  {
    heading: "Daily",
    body: "One word for everyone, released at midnight. Solving it keeps your streak going.",
  },
  {
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
              <span className="text-lg font-semibold">{way.heading}</span>
              <span className="text-[14.5px] leading-relaxed text-[#c9bfcc]">{way.body}</span>
            </div>
          ))}
        </div>
      </div>

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
