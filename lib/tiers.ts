// Display helpers for the Infinite tier leaderboard. Tier names, targets and
// rewards come from the server (GET /infinite/tiers) — only presentation
// lives here.

import type { TierNumber } from "@/types";

// From the Figma ("How tiers work" ladder).
export const TIER_COLORS: Record<TierNumber, string> = {
  1: "#9fd4e6", // Diamond
  2: "#c9bfcc", // Platinum
  3: "#e3b75a", // Gold
  4: "#aeb4bc", // Silver
  5: "#c98a5b", // Bronze
  6: "#b8704f", // Copper
  7: "#8c8494", // Iron
  8: "#6f6376", // Stone
};

// Not in GET /infinite/tiers yet (TierConfig.carryInPercent) — ask the
// backend to expose it; until then this mirrors the contract's default.
export const CARRY_IN_PERCENT = 20;

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
