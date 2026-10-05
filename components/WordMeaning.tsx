"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { WordMeaning as WordMeaningData } from "@/types";

// The answer's meaning under the revealed word, on every finished game
// (daily and Infinite). Meanings can run to several senses, so they're
// clamped to `lines` with a "more" toggle that only appears when the text
// is actually cut off. Renders nothing when the word has no meaning stored.

const CLAMP = { 1: "line-clamp-1", 2: "line-clamp-2", 3: "line-clamp-3" } as const;

export default function WordMeaning({
  meaning,
  lines = 3,
  align = "start",
  className = "",
}: {
  meaning: WordMeaningData | null | undefined;
  lines?: keyof typeof CLAMP;
  align?: "start" | "center";
  className?: string;
}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [meaning?.meaning, expanded]);

  if (!meaning?.meaning) return null;

  return (
    <div className={`flex flex-col gap-1 ${align === "center" ? "items-center text-center" : "items-start"} ${className}`}>
      <span className="text-xs text-foreground/50">
        <span className="font-semibold uppercase tracking-[0.14em]">Word meaning</span>
        {meaning.partOfSpeech && <span className="italic"> · {meaning.partOfSpeech}</span>}
      </span>
      <p ref={textRef} className={`text-sm leading-relaxed text-foreground/75 ${expanded ? "" : CLAMP[lines]}`}>
        {meaning.meaning}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-accent hover:underline"
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}
