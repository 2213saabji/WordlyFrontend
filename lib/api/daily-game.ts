// Daily mode — one shared word per UTC day; drives stats and streaks.

import type { Game } from "@/types";
import { apiFetch } from "./client";

export function getTodayGame(): Promise<{ game: Game }> {
  return apiFetch("/game/today");
}

export function submitGuess(guess: string): Promise<{ result: number[]; game: Game }> {
  return apiFetch("/game/guess", { method: "POST", body: { guess } });
}

export function getHistory(): Promise<{ games: Game[] }> {
  return apiFetch("/game/history");
}
