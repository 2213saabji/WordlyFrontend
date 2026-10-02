// Display helpers for the Infinite tier leaderboard. Tier names, targets,
// hint prices and rules come from the server (GET /infinite/tiers) — only
// presentation lives here.

import type { DemotionRule, InfiniteTiersResponse, TierNumber } from "@/types";

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

/** A tier's demotion rule: its own `demotion` (tiers 1–4 have longer
 * windows), else the top-level default. null for Tier 8 (can't drop). */
export function demotionRuleFor(tiers: InfiniteTiersResponse, tier: number): DemotionRule | null {
  if (tier >= 8) return null;
  return tiers.tiers.find((t) => t.tier === tier)?.demotion ?? tiers.demotion;
}

/** "in the last 14 days" — never "this week", since windows run 7–30 days. */
export function lastDays(windowDays: number): string {
  return `in the last ${windowDays} days`;
}

/** Coin-pack prices only — there's no other money in the app. */
export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatPaise(paise: number): string {
  return formatInr(paise / 100);
}

/** "1,000 coins", "10 coins", "1 coin". */
export function formatCoins(n: number): string {
  return plural(n, "coin").replace(/^\d+/, n.toLocaleString("en-IN"));
}

/** A tier's or round's hint price: 0 free, > 0 coins, null off. Falls back
 * to the deprecated `hintsEnabled` for payloads from before v0.2. */
export function hintCostOf(x: { hintCost?: number | null; hintsEnabled?: boolean }): number | null {
  if (x.hintCost !== undefined) return x.hintCost;
  return x.hintsEnabled ? 0 : null;
}

/** Points one idle day costs at `points` (mirrors the server's settle). */
export function decayFor(tiers: InfiniteTiersResponse, points: number): number {
  const { rate, minPoints } = tiers.decay;
  return Math.min(points, Math.max(minPoints, Math.floor(points * rate)));
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
