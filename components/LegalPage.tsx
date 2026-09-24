import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalSection {
  id: string;
  number: string;
  heading: string;
  body: ReactNode;
}

/** Shared layout for the numbered legal pages (privacy policy, terms) —
 * eyebrow/title/meta row, a sticky "on this page" anchor nav, numbered
 * sections, and a closing contact callout. */
export default function LegalPage({
  eyebrow,
  title,
  lastUpdated,
  readTime,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  readTime: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-270 flex-col gap-10 px-5 py-9 md:px-14 md:py-20">
      <div className="flex max-w-160 flex-col gap-4">
        <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-[#9a8aa2]">{eyebrow}</span>
        <h1 className="text-[34px] font-light leading-[1.04] tracking-[-0.03em] md:text-[56px]">{title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/7 px-3 py-1.5 text-[13px] text-[#c9bfcc]">
            Last updated {lastUpdated}
          </span>
          <span className="text-[13px] text-[#9a8aa2]">{readTime}</span>
        </div>
        <p className="text-[15px] leading-relaxed text-[#c9bfcc] md:text-[17px]">{intro}</p>
      </div>

      <div className="flex flex-wrap items-start gap-8 md:gap-14">
        <nav
          className="flex flex-1 flex-col gap-1 rounded-[20px] border border-white/8 bg-white/4 p-4.5 basis-55"
          style={{ maxWidth: 260 }}
        >
          <span className="px-2.5 pb-2.5 pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9a8aa2]">
            On this page
          </span>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="flex gap-2.5 rounded-[10px] px-2.5 py-2 text-sm text-[#c9bfcc] hover:bg-white/6 hover:text-foreground"
            >
              <span className="text-accent tabular-nums">{section.number}</span>
              {section.heading}
            </a>
          ))}
        </nav>

        <div className="flex flex-[3_1_420px] flex-col gap-9" style={{ maxWidth: 680 }}>
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="flex flex-col gap-3">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold tabular-nums text-accent">{section.number}</span>
                <span className="text-[21px] font-semibold tracking-[-0.01em]">{section.heading}</span>
              </div>
              <p className="text-[15.5px] leading-[1.75] text-[#c9bfcc]">{section.body}</p>
            </div>
          ))}

          <div className="rounded-[20px] border border-accent/28 bg-accent/8 px-6 py-5.5 text-[14.5px] leading-relaxed">
            Questions about this page? Write to{" "}
            <a href="mailto:support@guessword.games" className="text-accent">
              support@guessword.games
            </a>{" "}
            or use the{" "}
            <Link href="/contact" className="text-accent underline hover:no-underline">
              contact form
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
