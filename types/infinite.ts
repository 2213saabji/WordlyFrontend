// Infinite mode tier leaderboard (tiers, daily targets, ranking,
// promotion/demotion, decay, paid hints). Shapes follow the backend contract
// v0.3 as updated by v0.4 (docs/COINS_HINTS_CONTRACT.md); see
// lib/api/infinite-tiers.ts for the endpoints.

import type { Pagination } from "@/types";

/** 1 = Diamond (top) … 8 = Stone (entry tier every new player starts in). */
export type TierNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const TIER_NUMBERS: readonly TierNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** One row of the tier ladder, from the server's TierConfig. Thresholds are
 * config values that can change without a release — always render these,
 * never hardcode them. */
export interface TierDefinition {
  tier: TierNumber;
  name: string;
  /** Coins per hint: 0 free (Tiers 7–8), > 0 paid (Tiers 1–6), null = hints
   * off in this tier. */
  hintCost: number | null;
  /** @deprecated Same as hintCost === 0. */
  hintsEnabled: boolean;
  minActiveMinutes: number;
  minGamesCompleted: number;
  /** Consecutive qualifying days needed to move up (in Tier 1: the length of
   * one Diamond cycle). */
  daysToStick: number;
  /** Tier 1: a Diamond star each completed cycle. null elsewhere. */
  reward: { type: "star" } | null;
  /** This tier's rule — `misses` in any rolling `windowDays` demotes. Use
   * this, not the top-level default, for anything tier-specific (tiers 1–4
   * have longer windows). Optional only for older backends. */
  demotion?: DemotionRule;
}

export interface DemotionRule {
  misses: number;
  windowDays: number;
}

export interface InfiniteTiersResponse {
  version: number;
  tiers: TierDefinition[];
  scoring: { solveBase: number; perUnusedGuess: number; qualifyingDayBonus: number };
  /** Default rule, now only for tiers above `stickWindowMaxTier` (5–7).
   * Read per-tier rules via demotionRuleFor (lib/tiers.ts). */
  demotion: DemotionRule & { stickWindowMaxTier?: number };
  carryInPercent?: number;
  /** "HH:MM" in IST — the day boundary for everything in Infinite mode. */
  resetTimeIst: string;
  /** Points taken off the carry-in on a demotion (floor 0). */
  demotionPenalty: number;
  /** Each idle day (no completed Infinite game) costs max(minPoints,
   * floor(rate × points)). */
  decay: { rate: number; minPoints: number };
  coins: { solveReward: number };
}

/** Today's targets vs. progress for the player's current tier. A day
 * "qualifies" once both targets are met. */
export interface TodayProgress {
  activeMinutes: number;
  targetMinutes: number;
  gamesCompleted: number;
  targetGames: number;
  qualified: boolean;
}

export interface InfiniteTodayProgress extends TodayProgress {
  /** IST day, YYYY-MM-DD. */
  day: string;
  /** 0–1, display only (progress ring). */
  completionRatio: number;
  /** ISO timestamp of the next 00:00 IST reset. */
  resetsAt: string;
}

export interface TierWindowDay {
  day: string;
  qualified: boolean;
}

export type TierChangeReason = "promotion" | "demotion" | "seed" | "admin";

export interface InfiniteMeResponse {
  tier: TierNumber;
  tierName: string;
  /** This tier's hint price — see TierDefinition.hintCost. */
  hintCost: number | null;
  /** @deprecated Same as hintCost === 0. */
  hintsEnabled: boolean;
  score: number;
  /** null before the player's first completed Infinite game. */
  rank: number | null;
  tierSize: number;
  qualifyingDaysInTier: number;
  consistencyPercent: number;
  counter: {
    /** Consecutive qualifying days in this tier (in Tier 1: day X of the
     * Diamond cycle). */
    stickDays: number;
    daysToStick: number;
    daysLeft: number;
    resetsOnEntry: boolean;
  };
  demotion: {
    missesInWindow: number;
    limit: number;
    /** Rolling window length for the player's current tier (7–30). */
    windowDays?: number;
    /** true at limit − 1 misses (one more miss demotes). Server-computed —
     * don't recompute. */
    atRisk: boolean;
    /** Completed days only, oldest first, up to windowDays entries. Shorter
     * right after entering a tier: missing slots are "not counted yet". */
    window: TierWindowDay[];
  };
  today: InfiniteTodayProgress;
  lastChange: {
    fromTier: TierNumber;
    toTier: TierNumber;
    reason: TierChangeReason;
    oldRank: number | null;
    rankAtEntry: number | null;
    day: string;
    oldScore?: number;
    carriedPoints?: number;
    /** ≤ 0 — the demotion penalty taken (0 on promotions). */
    penalty?: number;
    entryPoints?: number;
  } | null;
  /** Diamond stars = completed Diamond cycles. */
  stars: number;
  /** One entry per completed Diamond cycle (`day` = IST day it completed). */
  completedCycles: CompletedCycle[];
  /** The most recent inactivity decay (`points` negative), or null. */
  lastDecay: { day: string; points: number } | null;
}

export interface CompletedCycle {
  cycle: number;
  day: string;
}

/** Added to POST /game/infinite/guess once the round ends — the round is
 * scored exactly once, server-side. */
export interface InfiniteGuessTierBlock {
  pointsAwarded: number;
  qualifyingBonusAwarded: number;
  score: number;
  rank: number;
  tierSize: number;
  /** Set when this round completed the tier's counter and the player moved
   * up on the spot (score and rank above are already the new tier's). */
  promotion?: { fromTier: TierNumber; toTier: TierNumber } | null;
  today: TodayProgress;
}

export interface InfiniteLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  qualifyingDaysInTier: number;
  stickDays: number;
}

export interface InfiniteLeaderboardResponse {
  tier: TierNumber;
  tierName: string;
  leaderboard: InfiniteLeaderboardEntry[];
  /** For the pinned row. When viewing another tier, inThisTier is false and
   * rank is null. null on the public (signed-out) board. */
  me: {
    rank: number | null;
    score: number;
    qualifyingDaysInTier: number;
    inThisTier: boolean;
  } | null;
  pagination: Pagination;
}

/** One entry of the append-only TierChange log. */
export interface TierChange {
  day: string;
  fromTier: TierNumber;
  toTier: TierNumber;
  reason: TierChangeReason;
  oldScore: number;
  oldRank: number | null;
  oldTierSize: number;
  /** = entryPoints (kept for older readers). */
  carriedScore: number;
  /** floor(carryInPercent% × points after that night's decay). */
  carriedPoints: number;
  /** ≤ 0 — the demotion penalty taken (0 on promotions). */
  penalty: number;
  /** Points the player entered the new tier with. */
  entryPoints: number;
  rankAtEntry: number | null;
  newTierSize: number;
  createdAt: string;
  /** The old tier's window at the moment of the move (up to 30 days for
   * tiers 1–4). Empty for moves logged before the field existed. */
  window?: TierWindowDay[];
}

// ASSUMED — the contract lists GET /infinite/tier-changes?page= but gives no
// response body; this follows the other paginated endpoints. Confirm with
// the backend.
export interface TierChangesResponse {
  changes: TierChange[];
  pagination: Pagination;
}

export type ScoreEventType = "game" | "day_bonus" | "decay" | "carry_in" | "demotion_penalty";

/** One tier-points change (GET /infinite/score-events). */
export interface ScoreEvent {
  id: string;
  type: ScoreEventType;
  /** Signed. */
  points: number;
  /** IST day. */
  day: string;
  tier: TierNumber;
  gameId: string | null;
  createdAt: string;
}

export interface ScoreEventsResponse {
  items: ScoreEvent[];
  nextCursor: string | null;
}
