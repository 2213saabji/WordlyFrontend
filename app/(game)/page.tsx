import Link from "next/link";
import AdSenseScript from "@/components/AdSenseScript";
import GameApp from "./GameApp";

const HIGHLIGHTS = [
  {
    heading: "Play free, no account",
    body: "Jump straight into Infinite from this page: unlimited five-letter words, no sign-up, nothing to install. Log in when you want streaks, coins and leaderboards.",
  },
  {
    heading: "Daily puzzle",
    body: "One five-letter word for everyone, new every day at midnight UTC. Solve it to build your streak.",
  },
  {
    heading: "Infinite tiers",
    body: "Unlimited rounds that earn points on a tiered leaderboard. Hit your daily targets to climb eight tiers, from Stone to Diamond.",
  },
  {
    heading: "Play with friends",
    body: "Create a group, share the invite code, and compete on daily and weekly leaderboards.",
  },
];

export default function HomePage() {
  return (
    <>
      <AdSenseScript />
      <GameApp intro={<Intro />} />
    </>
  );
}

// The guest home is server-rendered (PublicApp, via GameApp — it's what a
// signed-out visitor and every crawler sees first), but it's mostly
// buttons and short lines. This visible intro, rendered on the server and
// shown under the home screen for guests and logged-in players alike, gives
// the page real text about the game; home-page metadata comes from the root
// layout. Headings start at <h2> since the home screen already has the <h1>.
function Intro() {
  return (
    <section
      aria-labelledby="about-guessword"
      className="mx-auto flex w-full max-w-270 flex-col gap-8 px-5 py-14 md:px-14 md:py-20"
    >
      <div className="flex max-w-160 flex-col gap-4">
        <h2 id="about-guessword" className="text-[28px] font-light leading-[1.1] tracking-[-0.03em] md:text-[42px]">
          GuessWord — a free <strong className="font-bold">daily word guessing game.</strong>
        </h2>
        <p className="text-[15px] leading-relaxed text-[#c9bfcc] md:text-[16.5px]">
          GuessWord is a free online word game where you guess the word — a secret five-letter word — in six
          tries. After each guess, green tiles mark letters in the right spot, amber tiles mark letters in the word
          but in the wrong spot, and gray tiles mark letters that aren&apos;t in the word. It&apos;s a quick daily
          word puzzle that stretches your vocabulary, and it runs in any browser with no download.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {HIGHLIGHTS.map((item) => (
          <div key={item.heading} className="flex flex-col gap-2 border-t border-white/10 pt-5">
            <h3 className="text-lg font-semibold">{item.heading}</h3>
            <p className="text-[14.5px] leading-relaxed text-[#c9bfcc]">{item.body}</p>
          </div>
        ))}
      </div>

      <p className="text-[14.5px] text-[#c9bfcc]">
        New here? Read{" "}
        <Link href="/how-to-play" className="text-accent underline hover:no-underline">
          how to play
        </Link>
        , pick an opener from our{" "}
        <Link href="/guides/best-starting-words" className="text-accent underline hover:no-underline">
          best starting words guide
        </Link>
        , explore all the{" "}
        <Link href="/guides" className="text-accent underline hover:no-underline">
          strategy guides
        </Link>
        , browse the{" "}
        <Link href="/faq" className="text-accent underline hover:no-underline">
          FAQ
        </Link>
        , or see who&apos;s on top of the{" "}
        <Link href="/leaderboard/infinite" className="text-accent underline hover:no-underline">
          Infinite leaderboard
        </Link>
        .
      </p>
    </section>
  );
}
