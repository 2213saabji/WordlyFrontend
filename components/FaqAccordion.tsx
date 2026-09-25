"use client";

import { useState } from "react";

export type FaqItem = { question: string; answer: string };

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col border-t border-white/10">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question} className="flex flex-col border-b border-white/10">
            {/* Questions are headings and every answer stays in the DOM (just
                `hidden` when closed) so crawlers and answer engines can read
                all of them — FAQPage structured data on /faq must match
                content that's actually on the page. */}
            <h2>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                aria-controls={`faq-answer-${i}`}
                className="flex w-full items-center gap-4 py-5.5 pl-0.5 pr-0.5 text-left"
              >
                <span className="flex-1 text-[16.5px] font-semibold leading-snug">{item.question}</span>
                <span
                  className={`flex h-7.5 w-7.5 flex-none items-center justify-center rounded-[10px] text-lg ${
                    open ? "bg-accent text-background" : "bg-white/7 text-foreground"
                  }`}
                >
                  {open ? "–" : "+"}
                </span>
              </button>
            </h2>
            <p
              id={`faq-answer-${i}`}
              hidden={!open}
              className="animate-fade-in pb-6 pl-0.5 pr-12 text-[15px] leading-[1.7] text-[#c9bfcc]"
            >
              {item.answer}
            </p>
          </div>
        );
      })}
    </div>
  );
}
