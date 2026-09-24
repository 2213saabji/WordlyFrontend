import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GuessWord — Free Daily Word Guessing Game";

// Same palette as app/globals.css / lib/share-image.ts — kept as plain hex
// here too since satori (which renders this) doesn't support CSS variables
// or color-mix().
const COLORS = {
  background: "#17111b",
  foreground: "#f3ecef",
  muted: "#9a8aa2",
  correct: "#7fb069",
  present: "#e8c468",
  absent: "#4a3f52",
  accent: "#f2a05c",
};

const WORDMARK_TILES = [
  { char: "G", bg: COLORS.accent, fg: COLORS.background },
  { char: "U", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "E", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "S", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "S", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "W", bg: COLORS.correct, fg: COLORS.foreground },
  { char: "O", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "R", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
  { char: "D", bg: "rgba(255,255,255,0.08)", fg: COLORS.foreground },
];

// Purely decorative sample row — "GUESS" is the app's own vocabulary, not a
// real puzzle answer, so it can't spoil anything.
const SAMPLE_ROW: { char: string; bg: string }[] = [
  { char: "G", bg: COLORS.correct },
  { char: "U", bg: COLORS.absent },
  { char: "E", bg: COLORS.present },
  { char: "S", bg: COLORS.absent },
  { char: "S", bg: COLORS.correct },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: COLORS.background,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {WORDMARK_TILES.map((tile, i) => (
            <div
              key={i}
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                background: tile.bg,
                color: tile.fg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {tile.char}
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 34,
            fontWeight: 300,
            color: COLORS.foreground,
            letterSpacing: -0.5,
          }}
        >
          Guess the word of the day
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {SAMPLE_ROW.map((tile, i) => (
            <div
              key={i}
              style={{
                width: 66,
                height: 66,
                borderRadius: 12,
                background: tile.bg,
                color: COLORS.foreground,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {tile.char}
            </div>
          ))}
        </div>

        <div style={{ fontSize: 22, color: COLORS.muted }}>guessword.games · Free · No download</div>
      </div>
    ),
    { ...size },
  );
}
