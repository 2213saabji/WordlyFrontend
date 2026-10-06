// The signed-out visitor's current public round (lib/api/public-game.ts):
// the latest token plus the game it describes. Held in memory and mirrored
// to sessionStorage, so a refresh keeps the round but a new tab starts a
// fresh one. Every response replaces the token — a guess must always send
// the latest.

import { ApiRequestError, startPublicRound, submitPublicGuess } from "@/lib/api";
import type { Game } from "@/types";

const ROUND_KEY = "guessword_public_round";

interface PublicRound {
  token: string;
  game: Game;
}

let current: PublicRound | null = null;

function save(round: PublicRound | null): void {
  current = round;
  try {
    if (round) window.sessionStorage.setItem(ROUND_KEY, JSON.stringify(round));
    else window.sessionStorage.removeItem(ROUND_KEY);
  } catch {
    // Storage blocked — the round still lives in memory until a refresh.
  }
}

/** The saved round's game, or null when there's none to restore. */
export function restorePublicGame(): Game | null {
  if (!current && typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(ROUND_KEY);
      if (raw) current = JSON.parse(raw) as PublicRound;
    } catch {
      current = null;
    }
  }
  return current?.game ?? null;
}

export async function newPublicRound(): Promise<Game> {
  const { token, game } = await startPublicRound();
  save({ token, game });
  return game;
}

/** Rethrows the API error after updating the saved round: a broken token
 * (INVALID_GAME_TOKEN) clears it, and GAME_OVER stores the finished game it
 * carries. */
export async function guessPublicRound(guess: string): Promise<Game> {
  try {
    const { token, game } = await submitPublicGuess(current?.token ?? "", guess);
    save({ token, game });
    return game;
  } catch (err) {
    if (err instanceof ApiRequestError) {
      if (err.data?.code === "INVALID_GAME_TOKEN") save(null);
      else if (err.data?.code === "GAME_OVER" && err.data.game && current) save({ ...current, game: err.data.game });
    }
    throw err;
  }
}
