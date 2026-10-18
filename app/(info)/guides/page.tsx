import type { Metadata } from "next";
import Link from "next/link";
import ContentPage, { Eyebrow } from "@/components/ContentPage";
import { PlayCta } from "@/components/GuideParts";
import { GUIDES, GUIDES_PATH, GUIDES_UPDATED_ISO, formatGuideDate, guidePath } from "@/lib/guides";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Guides — Strategy, Starting Words & Tiers",
  description:
    "GuessWord guides built from our word lists: best starting words, letter frequency, word patterns, a solving method, Infinite tiers and playing with friends.",
  path: GUIDES_PATH,
});

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "GuessWord guides",
  url: `${SITE_URL}${GUIDES_PATH}`,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  hasPart: GUIDES.map((g) => ({ "@type": "Article", headline: g.title, url: `${SITE_URL}${guidePath(g.slug)}` })),
};

export default function GuidesPage() {
  return (
    <ContentPage
      title={
        <>
          Play smarter, <strong className="font-bold">not longer.</strong>
        </>
      }
      subtitle="Every number in these guides comes from the word lists GuessWord actually uses — the 5,028 words our three game modes can pick as answers — not from general English. So the advice fits the game you're actually playing."
    >
      <JsonLd data={[collectionJsonLd, breadcrumbJsonLd("Guides", GUIDES_PATH)]} />

      <div className="flex flex-col gap-5">
        <Eyebrow>All guides · updated {formatGuideDate(GUIDES_UPDATED_ISO)}</Eyebrow>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {GUIDES.map((guide, i) => (
            <Link
              key={guide.slug}
              href={guidePath(guide.slug)}
              className="group flex flex-col gap-3 rounded-3xl border border-white/8 bg-white/4 p-6.5 transition-colors hover:border-accent/40"
            >
              <span className="text-[13px] font-semibold text-accent">
                {String(i + 1).padStart(2, "0")} · {guide.readMinutes} min read
              </span>
              <h2 className="text-[19px] font-semibold leading-snug group-hover:text-accent">{guide.title}</h2>
              <span className="text-[14.5px] leading-relaxed text-[#c9bfcc]">{guide.description}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-[#c9bfcc]">
        <Eyebrow>How we made these</Eyebrow>
        <p>
          GuessWord has three answer lists: one for the Daily word (728 words), one for Infinite mode (1,456
          words) and one for rounds played without an account (2,844 words). We analysed each list on its own —
          letter counts, positions, endings, repeated letters — and scored every five-letter word the game accepts as
          an opening guess against them. Where the lists behave differently, the guides say so, because a strategy
          that works on the Daily word can mislead you in guest play, and the other way round.
        </p>
        <p>
          None of the guides reveal answers. Opening words are scored as guesses, statistics are shown only as
          percentages, and the Daily word itself is never listed anywhere on the site.
        </p>
      </div>

      <PlayCta />
    </ContentPage>
  );
}
