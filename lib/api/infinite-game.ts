// Infinite mode rounds — unlimited, per-round random word. Never touches
// Daily stats/streaks, but completed rounds are scored into the Infinite
// tier leaderboard server-side (see ./infinite-tiers). Infinite days run on
// IST (00:00 IST reset), unlike Daily's UTC day.

import type { CoinsAwarded, Game, InfiniteGuessTierBlock, TodayProgress } from "@/types";
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

/** Every guess counts toward active time. `tier` (with `tier.today`) and
 * `coins` are present only on the guess that ends the round (it's scored
 * exactly once); a top-level `today` on mid-round guesses only once the
 * backend adds it. */
export function submitInfiniteGuess(
  guess: string,
): Promise<{ result: number[]; game: Game; tier?: InfiniteGuessTierBlock; today?: TodayProgress; coins?: CoinsAwarded }> {
  return apiFetch("/game/infinite/guess", { method: "POST", body: { guess } });
}

export function getInfiniteHistory(): Promise<{ games: Game[] }> {
  return apiFetch("/game/infinite/history");
}

export interface RevealHintResponse {
  hint: string;
  /** 0 in free tiers and on a repeat call after the reveal. */
  coinsSpent: number;
  balance: number;
  hintsUsed: number;
  hintsLeft: number;
}

/** Reveals the round's word clue, priced by the player's tier at request
 * time (game.hintCost: 0 free, > 0 coins, null off). `expectedCost` is
 * required when the price is > 0 and must equal it — it's a guard against a
 * price change since the confirm sheet was shown, never what's charged.
 * Debit and reveal are one transaction: on any error nothing is deducted.
 * Errors: 402 INSUFFICIENT_COINS { balance, required } · 409
 * HINT_COST_CHANGED { hintCost, balance } · 409 NOTHING_TO_REVEAL · 403
 * HINTS_DISABLED_FOR_TIER · 400 NO_GAME_IN_PROGRESS. */
export function revealInfiniteHint(
  { gameId, expectedCost }: { gameId?: string; expectedCost?: number } = {},
): Promise<RevealHintResponse> {
  return apiFetch("/game/infinite/hint", { method: "POST", body: { gameId, expectedCost } });
}
