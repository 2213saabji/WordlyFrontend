import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/about";

export const metadata: Metadata = pageMetadata({
  title: "About Us — A Free Daily Word Game",
  description:
    "GuessWord is a free daily word-guessing game: one five-letter word a day, six tries, an unlimited practice mode, and group leaderboards — no download, no cost.",
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
    body: "No ads between guesses and no timers. Play at your own pace, any time before midnight.",
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
