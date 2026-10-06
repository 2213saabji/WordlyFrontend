import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import ContentPage, { Eyebrow } from "@/components/ContentPage";
import { GUIDES, GUIDES_PATH, GUIDES_UPDATED, GUIDES_UPDATED_ISO, guideBySlug, guidePath } from "@/lib/guides";
import { JsonLd, articleJsonLd, breadcrumbTrailJsonLd, pageMetadata } from "@/lib/seo";

// Building blocks for the /guides pages: the page shell (with its Article
// and breadcrumb structured data), data tables, example tile rows and the
// closing "more guides" + play links.

export function guideMetadata(slug: string): Metadata {
  const guide = guideBySlug(slug);
  return pageMetadata({ title: guide.title, description: guide.description, path: guidePath(slug) });
}

export function GuideLayout({
  slug,
  title,
  intro,
  children,
}: {
  slug: string;
  /** The on-page <h1>; the plain-text title from lib/guides.ts is used for metadata. */
  title: ReactNode;
  intro: string;
  children: ReactNode;
}) {
  const guide = guideBySlug(slug);
  const path = guidePath(slug);
  return (
    <ContentPage title={title} subtitle={intro}>
      <JsonLd
        data={[
          articleJsonLd({ title: guide.title, description: guide.description, path, dateModified: GUIDES_UPDATED_ISO }),
          breadcrumbTrailJsonLd([
            { name: "Guides", path: GUIDES_PATH },
            { name: guide.title, path },
          ]),
        ]}
      />
      <div className="-mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#9a8aa2]">
        <Link href={GUIDES_PATH} className="text-accent hover:underline">
          ← All guides
        </Link>
        <span aria-hidden>·</span>
        <span>{guide.readMinutes} min read</span>
        <span aria-hidden>·</span>
        <span>Updated {GUIDES_UPDATED}</span>
      </div>
      {children}
      <MoreGuides current={slug} />
    </ContentPage>
  );
}

/** Body copy inside a guide section. */
export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export function GuideLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-accent underline hover:no-underline">
      {children}
    </Link>
  );
}

/** A compact data table that scrolls sideways on narrow screens. */
export function StatTable({ head, rows, caption }: { head: string[]; rows: ReactNode[][]; caption?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-2xl border border-white/8">
        <table className="w-full min-w-105 border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-white/8 text-xs uppercase tracking-[0.12em] text-[#9a8aa2]">
              {head.map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/6 last:border-b-0">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-2.5 ${j === 0 ? "font-semibold text-foreground" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <span className="text-[12.5px] text-[#9a8aa2]">{caption}</span>}
    </div>
  );
}

export type TileTone = "correct" | "present" | "absent" | "empty";

const TILE_STYLE: Record<TileTone, string> = {
  correct: "bg-[#5f8f49] text-foreground",
  present: "bg-[#c28c3e] text-background",
  absent: "bg-white/8 text-[#9a8aa2]",
  empty: "border-2 border-white/10 bg-white/3 text-foreground",
};

const TONE_LABEL: Record<TileTone, string> = {
  correct: "green",
  present: "amber",
  absent: "gray",
  empty: "",
};

/** A guess drawn as game tiles. `tones` is one letter per tile: g (green),
 * a (amber), x (gray) or "." (not played yet). */
export function Tiles({ word, tones }: { word: string; tones: string }) {
  const parsed: TileTone[] = tones
    .split("")
    .map((t) => (t === "g" ? "correct" : t === "a" ? "present" : t === "x" ? "absent" : "empty"));
  const label = word
    .split("")
    .map((letter, i) => `${letter.toUpperCase()}${TONE_LABEL[parsed[i]] ? ` ${TONE_LABEL[parsed[i]]}` : ""}`)
    .join(", ");
  return (
    <div className="flex gap-1.5" role="img" aria-label={label}>
      {word.split("").map((letter, i) => (
        <span
          key={i}
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold uppercase md:h-11 md:w-11 md:text-xl ${TILE_STYLE[parsed[i]]}`}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

/** A worked example: rows of guesses with a line of reasoning under each. */
export function Walkthrough({ steps }: { steps: { word: string; tones: string; note: ReactNode }[] }) {
  return (
    <ol className="flex flex-col gap-5">
      {steps.map((step, i) => (
        <li key={i} className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-5">
          <Tiles word={step.word} tones={step.tones} />
          <span className="text-[14.5px] leading-relaxed">{step.note}</span>
        </li>
      ))}
    </ol>
  );
}

function MoreGuides({ current }: { current: string }) {
  const others = GUIDES.filter((g) => g.slug !== current);
  return (
    <div className="flex flex-col gap-5">
      <Eyebrow>More guides</Eyebrow>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {others.map((guide) => (
          <Link
            key={guide.slug}
            href={guidePath(guide.slug)}
            className="flex flex-col gap-1.5 rounded-2xl border border-white/8 bg-white/4 p-5 transition-colors hover:border-accent/40"
          >
            <span className="text-[15.5px] font-semibold">{guide.title}</span>
            <span className="text-[13.5px] leading-relaxed text-[#c9bfcc]">{guide.description}</span>
          </Link>
        ))}
      </div>
      <PlayCta />
    </div>
  );
}

export function PlayCta() {
  return (
    <div className="flex flex-wrap items-center gap-5 rounded-3xl border border-accent/28 bg-accent/8 p-7">
      <div className="flex flex-1 basis-70 flex-col gap-1.5">
        <span className="text-lg font-semibold">Try it on a real board</span>
        <span className="text-[14.5px] text-[#c9bfcc]">
          Infinite mode is free and needs no account — play as many words as you like.
        </span>
      </div>
      <Link
        href="/"
        className="whitespace-nowrap rounded-2xl bg-accent px-6 py-3.75 text-[15px] font-bold text-background transition-transform duration-150 hover:-translate-y-0.5"
      >
        Play now
      </Link>
    </div>
  );
}
