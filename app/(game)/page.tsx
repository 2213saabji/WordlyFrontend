import Link from "next/link";
import GameApp from "./GameApp";

const HIGHLIGHTS = [
  {
    heading: "Daily puzzle",
    body: "One five-letter word for everyone, new every day at midnight UTC. Solve it to build your streak.",
  },
  {
    heading: "Infinite mode",
    body: "Unlimited practice rounds with a fresh word each time — it never affects your streak or stats.",
  },
  {
    heading: "Play with friends",
    body: "Create a group, share the invite code, and compete on daily and weekly leaderboards.",
  },
];

export default function HomePage() {
  return <GameApp intro={<Intro />} />;
}

// The game itself is client-only (auth state decides which screen shows, and
// the first server render is just a loader), so on its own this route would
// give crawlers — which never sign in — only a loader and a login form. This
// visible intro is rendered on the server and handed to GameApp, which shows
// it under the login screen only; home-page metadata comes from the root
// layout. Headings start at <h2> since the login screen already has the <h1>.
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
        </Link>{" "}
        or browse the{" "}
        <Link href="/faq" className="text-accent underline hover:no-underline">
          FAQ
        </Link>
        .
      </p>
    </section>
  );
}
