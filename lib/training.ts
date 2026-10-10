"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { GameStatus } from "@/types";
import type { PlayMode } from "@/lib/screen-context";

// The signed-in PlayScreen reports its round here, so the training
// (components/Training.tsx) can follow the game it walks the player through
// — first guess made, round over — without PlayScreen knowing about it.

export interface PlayState {
  mode: PlayMode;
  status: GameStatus;
  guesses: number;
  /** Infinite: the tier result card (points, coins) is up — only after a
   * round ends on this visit, not for one that was already over. */
  tierResult: boolean;
  /** The hint bulb is up and unlocked (free-hint tiers, from guess 4). */
  hintBulb: boolean;
  hintRevealed: boolean;
}

let state: PlayState | null = null;
const listeners = new Set<() => void>();

export function reportPlayState(next: PlayState | null) {
  if (
    state === next ||
    (state &&
      next &&
      state.mode === next.mode &&
      state.status === next.status &&
      state.guesses === next.guesses &&
      state.tierResult === next.tierResult &&
      state.hintBulb === next.hintBulb &&
      state.hintRevealed === next.hintRevealed)
  ) {
    return;
  }
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Rendered by the signed-in PlayScreen with its current round. */
export function PlayStateReporter({ mode, status, guesses, tierResult, hintBulb, hintRevealed }: PlayState) {
  useEffect(() => {
    reportPlayState({ mode, status, guesses, tierResult, hintBulb, hintRevealed });
  }, [mode, status, guesses, tierResult, hintBulb, hintRevealed]);
  useEffect(() => () => reportPlayState(null), []);
  return null;
}

// The share window (ShareModal) while it's open: a new number each time it
// opens, so the training's optional share tour starts over every time.
let shareSession: number | null = null;
let shareOpens = 0;

/** Called by ShareModal: marks it open for as long as it's mounted. */
export function useReportShareOpen() {
  useEffect(() => {
    shareSession = ++shareOpens;
    listeners.forEach((l) => l());
    return () => {
      shareSession = null;
      listeners.forEach((l) => l());
    };
  }, []);
}

export function useShareSession(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => shareSession,
    () => null,
  );
}

export function usePlayState(): PlayState | null {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => null,
  );
}
