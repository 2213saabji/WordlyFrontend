// Infinite mode rounds — unlimited, per-round random word. Never touches
// Daily stats/streaks, but completed rounds are scored into the Infinite
// tier leaderboard server-side (see ./infinite-tiers). Infinite days run on
// IST (00:00 IST reset), unlike Daily's UTC day.

import type { Game, InfiniteGuessTierBlock, TodayProgress } from "@/types";
import { apiFetch } from "./client";

// Active time is measured server-side from these calls alone: each round
// start and guess credits the gap since the previous one, capped at 2 min.
// There's no heartbeat any more — normal play is all it takes.

/** Returning the round already in progress adds no time; creating one
 * (none in progress) counts as a round start. `today` only once the
 * backend adds it (optional). */
export function getInfiniteCurrent(): Promise<{ game: Game; today?: TodayProgress }> {
  return apiFetch("/game/infinite/current");
}

/** Also doubles as "skip": abandons whatever round is active. Counts as a
 * round start, and returns the updated `today`. */
export function startNewInfiniteRound(): Promise<{ game: Game; today?: TodayProgress }> {
  return apiFetch("/game/infinite/new", { method: "POST" });
}

/** Every guess counts toward active time. `tier` (with `tier.today`) is
 * present only on the guess that ends the round (it's scored exactly once);
 * a top-level `today` on mid-round guesses only once the backend adds it. */
export function submitInfiniteGuess(
  guess: string,
): Promise<{ result: number[]; game: Game; tier?: InfiniteGuessTierBlock; today?: TodayProgress }> {
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
