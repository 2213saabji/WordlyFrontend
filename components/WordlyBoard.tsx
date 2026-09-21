"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Guess } from "@/types";

const SHAKE_DURATION_MS = 550;

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;

type TileTheme = { bg: string; border: string; fg: string };

const EMPTY_THEME: TileTheme = {
  bg: "color-mix(in srgb, var(--foreground) 3%, transparent)",
  border: "color-mix(in srgb, var(--foreground) 8%, transparent)",
  fg: "var(--foreground)",
};

const CURSOR_THEME: TileTheme = {
  bg: "color-mix(in srgb, var(--foreground) 3%, transparent)",
  border: "var(--color-accent)",
  fg: "var(--foreground)",
};

const TYPED_THEME: TileTheme = {
  bg: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
  border: "color-mix(in srgb, var(--color-accent) 55%, transparent)",
  fg: "var(--foreground)",
};

const RESULT_THEME: Record<number, TileTheme> = {
  1: { bg: "var(--color-correct)", border: "var(--color-correct)", fg: "#fff" },
  [-1]: { bg: "var(--color-present)", border: "var(--color-present)", fg: "var(--background)" },
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
  interactive = true,
}: {
  guesses: Guess[];
  currentGuess: string;
  shakeSignal?: number;
  celebrate?: boolean;
  /** false once the game is over — suppresses the "next cell to type" cursor
   * highlight on the first empty row, which otherwise implies play is still live. */
  interactive?: boolean;
}) {
  const activeRowIndex = guesses.length;
  const winningRowIndex = celebrate ? guesses.length - 1 : -1;

  // shakeSignal only ever increments, so a plain truthiness check would keep
  // shaking forever after the first rejected guess — including on later
  // keystrokes, since the current row's tiles remount as you type. Instead,
  // "shaking" is derived by comparing the live signal against the last value
  // it settled on — true the instant a new signal arrives, with no state
  // update needed to turn it on. The effect only ever writes state async
  // (inside the timeout), to settle it back off after the animation window.
  const [settledShakeSignal, setSettledShakeSignal] = useState(shakeSignal ?? 0);
  const isShaking = (shakeSignal ?? 0) !== settledShakeSignal;

  useEffect(() => {
    if (!isShaking) return;
    const id = setTimeout(() => setSettledShakeSignal(shakeSignal ?? 0), SHAKE_DURATION_MS);
    return () => clearTimeout(id);
  }, [isShaking, shakeSignal]);

  const rows = Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => {
    const submitted = guesses[rowIndex];
    const isCurrentRow = interactive && rowIndex === activeRowIndex;
    const isRevealRow = rowIndex === guesses.length - 1 && !!submitted;
    const isWinningRow = rowIndex === winningRowIndex;
    const letters = submitted
      ? submitted.guess.split("")
      : isCurrentRow
        ? currentGuess.padEnd(WORD_LENGTH, " ").split("")
        : Array(WORD_LENGTH).fill(" ");

    const cursorIndex = isCurrentRow ? currentGuess.length : -1;

    return (
      <div key={rowIndex} className="flex gap-1.5">
        {letters.map((letter, colIndex) => {
          const result = submitted?.result[colIndex];
          const hasLetter = letter.trim() !== "";
          const endTheme =
            result !== undefined
              ? (RESULT_THEME[result] ?? TYPED_THEME)
              : hasLetter
                ? TYPED_THEME
                : colIndex === cursorIndex
                  ? CURSOR_THEME
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
                className="flex h-15 w-15 items-center justify-center rounded-xl border-2 text-2xl font-bold uppercase transition-colors duration-150 md:rounded-[14px]"
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

  return <div className="mx-auto flex w-fit flex-col gap-1.5">{rows}</div>;
}
