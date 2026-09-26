// Infinite mode rounds — unlimited, per-round random word. Never touches
// Daily stats/streaks, but completed rounds are scored into the Infinite
// tier leaderboard server-side (see ./infinite-tiers). Infinite days run on
// IST (00:00 IST reset), unlike Daily's UTC day.

import type { Game, InfiniteGuessTierBlock } from "@/types";
import { apiFetch } from "./client";

export function getInfiniteCurrent(): Promise<{ game: Game }> {
  return apiFetch("/game/infinite/current");
}

/** Also doubles as "skip": abandons whatever round is active. */
export function startNewInfiniteRound(): Promise<{ game: Game }> {
  return apiFetch("/game/infinite/new", { method: "POST" });
}

/** Also counts as an activity heartbeat server-side. `tier` is present only
 * on the guess that ends the round (it's scored exactly once). */
export function submitInfiniteGuess(
  guess: string,
): Promise<{ result: number[]; game: Game; tier?: InfiniteGuessTierBlock }> {
  return apiFetch("/game/infinite/guess", { method: "POST", body: { guess } });
}

export function getInfiniteHistory(): Promise<{ games: Game[] }> {
  return apiFetch("/game/infinite/history");
}

/** In-progress Infinite rounds no longer carry `hint` in the game payload —
 * this is the only way to reveal it mid-round. Rejected with 403
 * HINTS_DISABLED_FOR_TIER in Tiers 1–6 (checked against the player's tier
 * at request time, not the tier the round started in). */
export function revealInfiniteHint(): Promise<{ hint: string }> {
  return apiFetch("/game/infinite/hint", { method: "POST" });
}
