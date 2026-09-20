import type { Game } from "@/types";

// Same fixed epoch the backend's daily cycle is anchored to (utils/dailyWord.js
// EPOCH_UTC) — used only to derive the display-only puzzle number, never to
// pick a word.
const DAILY_EPOCH_UTC = Date.UTC(2024, 0, 1);

export function wordNumberForDate(dateKey: string): number {
  const dayMs = new Date(`${dateKey}T00:00:00Z`).getTime();
  return Math.round((dayMs - DAILY_EPOCH_UTC) / 86_400_000) + 1;
}

export function resultRows(game: Game): number[][] {
  return game.guesses.map((g) => g.result);
}

function rowToEmoji(row: number[]): string {
  return row.map((r) => (r === 1 ? "🟩" : r === -1 ? "🟨" : "⬛")).join("");
}

/** Never includes the word itself — only the emoji grid, same as real Wordle's share text. */
export function buildShareText(game: Game, wordNumber: number): string {
  const rows = resultRows(game).map(rowToEmoji);
  return [`Wordly Daily #${wordNumber} ${game.guesses.length}/6`, "", ...rows].join("\n");
}

/**
 * A "replay" link is only meaningful same-day: daily mode's word is picked
 * from the server's current date (see backend's wordForDate), so anyone who
 * opens this on the same calendar day lands on the identical word — no
 * lookup-by-date endpoint needed. It naturally goes stale at the next UTC
 * daily rollover, matching the "expires at midnight" copy in the share UI.
 */
export function buildReplayLink(wordNumber: number, username: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({ r: `${wordNumber}-${username}` });
  return `${origin}/?${params.toString()}`;
}

export interface ReplayInvite {
  wordNumber: number;
  username: string;
}

export function parseReplayParam(search: string): ReplayInvite | null {
  const value = new URLSearchParams(search).get("r");
  if (!value) return null;
  const match = /^(\d+)-(.+)$/.exec(value);
  if (!match) return null;
  const wordNumber = Number(match[1]);
  if (!Number.isFinite(wordNumber)) return null;
  return { wordNumber, username: decodeURIComponent(match[2]) };
}
