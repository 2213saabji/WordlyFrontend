// Infinite tier leaderboard — Phase 1: the 8-tier ladder, the player's tier
// status and today's progress, active-time heartbeats, the per-tier ranked
// board and tier-change history. Money fields in these responses (rewardInr,
// reward) are only rendered when MONEY_ENABLED is on (lib/flags.ts).

import type {
  HeartbeatRequest,
  HeartbeatResponse,
  InfiniteLeaderboardResponse,
  InfiniteMeResponse,
  InfiniteTiersResponse,
  TierChangesResponse,
  TierNumber,
} from "@/types";
import { apiFetch, pageQuery, type PageOptions } from "./client";

/** The tier ladder from the server's TierConfig (names, targets, days to
 * stick, reward). Thresholds change without a release — never hardcode. */
export function getInfiniteTiers(): Promise<InfiniteTiersResponse> {
  return apiFetch("/infinite/tiers");
}

/** The caller's tier status and today's progress card. Returns Tier 8
 * defaults with rank: null before their first completed Infinite game. */
export function getInfiniteMe(): Promise<InfiniteMeResponse> {
  return apiFetch("/infinite/me");
}

/** Send every ~15 s while an Infinite game is visible and the player has
 * given input in the last 60 s. The server credits time per user (extra
 * tabs can't double-count) and rate-limits to 1 per 10 s — excess beats
 * come back 200 with creditedMs: 0, never an error. */
export function sendInfiniteHeartbeat(payload: HeartbeatRequest): Promise<HeartbeatResponse> {
  return apiFetch("/infinite/activity/heartbeat", { method: "POST", body: payload });
}

/** `tier` defaults server-side to the caller's own. `me` is always included
 * for the pinned row; viewing another tier gives me.inThisTier: false and
 * me.rank: null. An out-of-range tier is 400 INVALID_TIER. */
export function getInfiniteLeaderboard(
  options: PageOptions & { tier?: TierNumber } = {},
): Promise<InfiniteLeaderboardResponse> {
  return apiFetch(`/leaderboard/infinite?${pageQuery(options, { tier: options.tier?.toString() })}`);
}

// --- Public (no login) — the /leaderboard/infinite page. ---
// Sent without the access token, so a signed-out visitor never hits the
// 401 → refresh → redirect-to-login path. Needs the backend to allow these
// two routes unauthenticated (not in contract v0.3 — requested). `me` comes
// back null; a tier must be passed since there's no "own tier" to default to.

export function getPublicInfiniteTiers(): Promise<InfiniteTiersResponse> {
  return apiFetch("/infinite/tiers", { skipAuth: true });
}

export function getPublicInfiniteLeaderboard(
  options: PageOptions & { tier: TierNumber },
): Promise<InfiniteLeaderboardResponse> {
  return apiFetch(`/leaderboard/infinite?${pageQuery(options, { tier: options.tier.toString() })}`, {
    skipAuth: true,
  });
}

/** The caller's promotions/demotions, newest first. */
export function getInfiniteTierChanges(options: PageOptions = {}): Promise<TierChangesResponse> {
  return apiFetch(`/infinite/tier-changes?${pageQuery(options)}`);
}
