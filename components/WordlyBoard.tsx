"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Guess } from "@/types";

const SHAKE_DURATION_MS = 550;

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

type TileTheme = { bg: string; border: string; fg: string };

const EMPTY_THEME: TileTheme = {
  bg: "transparent",
  border: "var(--border)",
  fg: "var(--foreground)",
};

const TYPED_THEME: TileTheme = {
  bg: "transparent",
  border: "color-mix(in srgb, var(--foreground) 55%, transparent)",
  fg: "var(--foreground)",
};

const RESULT_THEME: Record<number, TileTheme> = {
  1: { bg: "var(--color-correct)", border: "var(--color-correct)", fg: "#fff" },
  [-1]: { bg: "var(--color-present)", border: "var(--color-present)", fg: "#fff" },
  0: { bg: "var(--color-absent)", border: "var(--color-absent)", fg: "#fff" },
};

function tileVars(theme: TileTheme, prefix: "start" | "end"): CSSProperties {
  return {
    [`--tile-${prefix}-bg`]: theme.bg,
    [`--tile-${prefix}-border`]: theme.border,
    [`--tile-${prefix}-fg`]: theme.fg,
  } as CSSProperties;
}

export default function WordlyBoard({
  guesses,
  currentGuess,
  shakeSignal,
  celebrate,
}: {
  guesses: Guess[];
  currentGuess: string;
  shakeSignal?: number;
  celebrate?: boolean;
}) {
  const activeRowIndex = guesses.length;
  const winningRowIndex = celebrate ? guesses.length - 1 : -1;

  // shakeSignal only ever increments, so a plain truthiness check would keep
  // shaking forever after the first rejected guess — including on later
  // keystrokes, since the current row's tiles remount as you type. Only
  // treat a shake as "live" for a short window right after it fires.
  const [isShaking, setIsShaking] = useState(false);
  const shakeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!shakeSignal) return;
    setIsShaking(true);
    if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    shakeTimeout.current = setTimeout(() => setIsShaking(false), SHAKE_DURATION_MS);
    return () => {
      if (shakeTimeout.current) clearTimeout(shakeTimeout.current);
    };
  }, [shakeSignal]);

  const rows = Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => {
    const submitted = guesses[rowIndex];
    const isCurrentRow = rowIndex === activeRowIndex;
    const isRevealRow = rowIndex === guesses.length - 1 && !!submitted;
    const isWinningRow = rowIndex === winningRowIndex;
    const letters = submitted
      ? submitted.guess.split("")
      : isCurrentRow
        ? currentGuess.padEnd(WORD_LENGTH, " ").split("")
        : Array(WORD_LENGTH).fill(" ");

    return (
      <div key={rowIndex} className="grid grid-cols-5 gap-1.5">
        {letters.map((letter, colIndex) => {
          const result = submitted?.result[colIndex];
          const hasLetter = letter.trim() !== "";
          const endTheme =
            result !== undefined
              ? (RESULT_THEME[result] ?? TYPED_THEME)
              : hasLetter
                ? TYPED_THEME
                : EMPTY_THEME;

          const flipDelay = colIndex * 90;
          const bounceDelay = 480 + colIndex * 80;
          const animation = isRevealRow
            ? isWinningRow
              ? `tile-flip 0.55s ease ${flipDelay}ms both, tile-bounce 0.7s ease ${bounceDelay}ms both`
              : `tile-flip 0.55s ease ${flipDelay}ms both`
            : undefined;

          const style: CSSProperties = {
            ...tileVars(EMPTY_THEME, "start"),
            ...tileVars(endTheme, "end"),
            backgroundColor: isRevealRow ? undefined : endTheme.bg,
            borderColor: isRevealRow ? undefined : endTheme.border,
            color: isRevealRow ? undefined : endTheme.fg,
            animation,
          };

          const cellDelay = (rowIndex * 47 + colIndex * 29) % 90;
          // Nudge the delay by 0/1ms on alternating shakes so the animation string
          // changes and restarts without a key change — a key change would remount
          // the tile and replay its flip/bounce reveal too.
          const shakeNudge = (shakeSignal ?? 0) % 2;
          const hopStyle: CSSProperties = isShaking
            ? { animation: `letter-hop 0.4s ease-out ${cellDelay + shakeNudge}ms both` }
            : {};
          const wrapperStyle: CSSProperties = isShaking
            ? { animation: `shake-arc 0.25s ease-in-out 2 ${cellDelay + shakeNudge}ms both` }
            : {};

          return (
            <div
              key={isCurrentRow ? `cur-${colIndex}-${letter}` : colIndex}
              style={wrapperStyle}
              className="perspective-tile"
            >
              <div
                style={style}
                className="flex aspect-square min-w-15 items-center justify-center rounded-sm border-2 text-2xl font-bold uppercase transition-colors duration-150"
              >
                <span style={hopStyle} className="inline-block">
                  {hasLetter ? letter : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  });

  return <div className="mx-auto grid max-w-xl gap-1.5">{rows}</div>;
}
