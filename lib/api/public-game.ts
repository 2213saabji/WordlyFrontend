// Public game (no login) — unlimited rounds for signed-out visitors on "/".
// Nothing is recorded server-side (no user, coins, stats, tiers or board
// entries): the round lives in an encrypted `token` the server returns from
// every call. Never sent with the access token, even when one is saved.
// Token storage and the round-restore rules live in lib/public-round.ts.

import type { Game } from "@/types";
import { apiFetch } from "./client";

export interface PublicRoundResponse {
  /** Opaque and encrypted: never decode or show it. Replaces the previous
   * one on every response. */
  token: string;
  /** mode "public". `hint` is always present and free; `word`,
   * `wordMeaning` and `timeTakenMs` once the round is won or lost. */
  game: Game;
}

/** Starts a round. Also "skip": there's no penalty and nothing to abandon. */
export function startPublicRound(): Promise<PublicRoundResponse> {
  return apiFetch("/public/game/new", { method: "POST", skipAuth: true });
}

/** Errors: 400 INVALID_GUESS (not 5 letters) · 400 NOT_A_WORD (doesn't use
 * a turn) · 400 INVALID_GAME_TOKEN (start a new round) · 409 GAME_OVER
 * (round already finished; includes `game`). */
export function submitPublicGuess(
  token: string,
  guess: string,
): Promise<PublicRoundResponse & { result: number[] }> {
  return apiFetch("/public/game/guess", { method: "POST", body: { token, guess }, skipAuth: true });
}
