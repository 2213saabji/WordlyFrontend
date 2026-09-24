"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api";

const MIN_LENGTH = 2;
// Client-side cap, stricter than the backend's own limit of 30 — the
// backend will happily accept up to 30 if this ever needs loosening.
const MAX_LENGTH = 20;
// Client-side filter only, to keep the tile preview meaningful as you type —
// the backend itself doesn't restrict character set, only length (after
// trimming) and that it isn't blank.
const ALLOWED_CHARS = /[^A-Za-z0-9 ]/g;

type TileVariant = "placeholder" | "accent" | "highlight" | "plain";

interface NameTile {
  char: string;
  variant: TileVariant;
}

const TILE_THEME: Record<TileVariant, { bg: string; fg: string }> = {
  placeholder: { bg: "color-mix(in srgb, var(--foreground) 3%, transparent)", fg: "color-mix(in srgb, var(--foreground) 45%, transparent)" },
  accent: { bg: "var(--color-accent)", fg: "var(--background)" },
  highlight: { bg: "var(--color-accent-2)", fg: "var(--foreground)" },
  plain: { bg: "color-mix(in srgb, var(--foreground) 8%, transparent)", fg: "var(--foreground)" },
};

/** Splits the (already uppercased) name into word-groups of tiles — spaces
 * break a new group so multi-word names wrap as whole words, not mid-word.
 * The very first letter and (if there's more than one letter) the very last
 * letter get their own highlight color; everything else is plain. */
function buildNameWords(value: string): NameTile[][] {
  if (!value) return [[{ char: "?", variant: "placeholder" }]];
  const chars = value.toUpperCase().split("");
  const words: NameTile[][] = [];
  let current: NameTile[] = [];
  chars.forEach((ch, i) => {
    if (ch === " ") {
      if (current.length) words.push(current);
      current = [];
      return;
    }
    const variant: TileVariant = i === 0 ? "accent" : i === chars.length - 1 && chars.length > 1 ? "highlight" : "plain";
    current.push({ char: ch, variant });
  });
  if (current.length) words.push(current);
  return words.length ? words : [[{ char: "?", variant: "placeholder" }]];
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.75 w-3.75">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function NameTilePreview({ words, maxTile, gap }: { words: NameTile[][]; maxTile: number; gap: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(maxTile * 10);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const longest = Math.max(1, ...words.map((w) => w.length));
  const tileWidth = Math.min(maxTile, Math.floor((containerWidth - gap * (longest - 1)) / longest));
  const tileHeight = Math.round(tileWidth * 1.15);
  const fontSize = Math.round(tileWidth * 0.52);
  const radius = Math.round(tileWidth * 0.26);

  return (
    <div ref={containerRef} className="flex min-h-14 w-full flex-wrap items-center justify-center gap-x-3.5 gap-y-2.5">
      {words.map((word, wi) => (
        <div key={wi} className="flex flex-nowrap" style={{ gap }}>
          {word.map((tile, ti) => {
            const theme = TILE_THEME[tile.variant];
            const style: CSSProperties = {
              width: tileWidth,
              height: tileHeight,
              fontSize,
              borderRadius: radius,
              backgroundColor: theme.bg,
              borderColor: theme.bg,
              color: theme.fg,
            };
            return (
              <span
                key={ti}
                style={style}
                className="flex flex-none items-center justify-center border-2 font-bold uppercase"
              >
                {tile.char}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function EditNameModal({ onClose }: { onClose: () => void }) {
  const { user, updateUsername } = useAuth();
  const [value, setValue] = useState(user?.username ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = value.trim();
  const isValid = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH;
  const words = useMemo(() => buildNameWords(value), [value]);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 10_000);
    return () => clearTimeout(id);
  }, [error]);

  function handleChange(next: string) {
    setValue(next.replace(ALLOWED_CHARS, "").slice(0, MAX_LENGTH));
    setError(null);
  }

  async function handleSave() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateUsername(value);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || typeof document === "undefined") return null;

  // Nav's <header> uses backdrop-blur, which — like transform/filter —
  // establishes a new containing block for fixed-position descendants, so a
  // plain `fixed inset-0` here would size itself to the header instead of
  // the viewport. Rendering into a portal on document.body sidesteps that
  // regardless of what ancestor styling changes later.
  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-background/70 backdrop-blur-sm md:items-center md:p-6">
      {/* mobile: bottom sheet — capped at 90vh and scrollable, since the
          sheet is bottom-anchored and would otherwise overflow above the
          top of the screen on shorter viewports with no way to reach it. */}
      <div
        className="flex max-h-[90vh] w-full animate-fade-in-up flex-col gap-6.5 overflow-y-auto rounded-t-[30px] border-t border-white/10 bg-surface px-5.5 pb-6.5 pt-3.5 md:hidden"
      >
        <span className="mx-auto h-1 w-11 rounded-full bg-white/18" />

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">
            Your name on GuessWord
          </span>
          <span className="text-2xl font-light tracking-tight">
            How should we <span className="font-bold">spell you?</span>
          </span>
        </div>

        <div className="flex flex-col items-center gap-3.5 rounded-3xl border border-white/8 bg-white/4 px-3 py-7.5">
          <NameTilePreview words={words} maxTile={40} gap={5} />
          <span className="text-center text-[12.5px] text-foreground/50">
            This is how you appear on leaderboards and groups
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-accent/60 bg-background/60 py-1.5 pl-4 pr-1.5">
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Your name"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-foreground/40"
            />
            <span className="flex-none rounded-xl px-2.5 py-2 text-[12.5px] tabular-nums text-foreground/50">
              {value.length}/{MAX_LENGTH}
            </span>
          </div>
          <p className={`text-[12.5px] ${error ? "text-danger" : "text-foreground/50"}`}>
            {error ?? "Letters, numbers and spaces"}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || submitting}
            className="flex-1 rounded-2xl bg-accent py-4 text-center text-[15.5px] font-bold text-background shadow-sm shadow-accent/30 transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save name"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap rounded-2xl border border-white/12 bg-white/7 px-5.5 py-4 text-[15.5px] font-semibold transition-colors hover:bg-white/12"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* desktop: centered card */}
      <div className="hidden max-h-[90vh] w-full max-w-130 animate-fade-in-up flex-col gap-7 overflow-y-auto rounded-[28px] border border-white/10 bg-surface p-8.5 shadow-xl shadow-black/40 md:flex">
        <div className="flex items-start gap-3.5">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">
              Your name on GuessWord
            </span>
            <span className="text-[28px] font-light tracking-tight">
              How should we <span className="font-bold">spell you?</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-8 w-8 flex-none items-center justify-center rounded-[11px] bg-white/7 text-foreground/60 transition-colors hover:bg-white/12 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4.5 rounded-3xl border border-white/8 bg-white/4 px-5 py-9">
          <NameTilePreview words={words} maxTile={48} gap={6} />
          <span className="text-center text-[13px] text-foreground/50">
            This is how you appear on leaderboards and groups
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-accent/60 bg-background/60 py-1.5 pl-4.5 pr-1.5">
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Your name"
              className="min-w-0 flex-1 bg-transparent py-3 text-[16.5px] outline-none placeholder:text-foreground/40"
            />
            <span className="flex-none rounded-xl px-3 py-2 text-[13px] tabular-nums text-foreground/50">
              {value.length}/{MAX_LENGTH}
            </span>
          </div>
          <p className={`text-[12.5px] ${error ? "text-danger" : "text-foreground/50"}`}>
            {error ?? "Letters, numbers and spaces. Everyone in your groups sees the change right away."}
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap rounded-2xl border border-white/12 bg-white/7 px-6 py-3.75 text-[15px] font-semibold transition-colors hover:bg-white/12"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || submitting}
            className="whitespace-nowrap rounded-2xl bg-accent px-7 py-3.75 text-[15px] font-bold text-background shadow-sm shadow-accent/30 transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save name"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
