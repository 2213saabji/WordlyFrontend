// Infinite tier leaderboard — Phase 1: the 8-tier ladder, the player's tier
// status and today's progress, the per-tier ranked board and tier-change
// history and the points feed. Active time needs no call
// of its own: the server measures it from round starts and guesses
// (POST /infinite/activity/heartbeat is legacy, for old app versions only).

import type {
  InfiniteLeaderboardResponse,
  InfiniteMeResponse,
  InfiniteTiersResponse,
  ScoreEventsResponse,
  TierChangesResponse,
  TierNumber,
} from "@/types";
import { apiFetch, pageQuery, type PageOptions } from "./client";

/** The tier ladder from the server's TierConfig (names, targets, days to
 * stick, hint cost, decay, demotion penalty). Thresholds change without a release — never hardcode. */
export function getInfiniteTiers(): Promise<InfiniteTiersResponse> {
  return apiFetch("/infinite/tiers");
}

/** The caller's tier status and today's progress card. Returns Tier 8
 * defaults with rank: null before their first completed Infinite game. */
export function getInfiniteMe(): Promise<InfiniteMeResponse> {
  return apiFetch("/infinite/me");
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

/** Every tier-points change (games, day bonus, decay, carry-in, demotion
 * penalty), newest first, paged by `nextCursor`. Days up to yesterday are
 * settled before listing. Recorded from the v0.2 release on (no backfill). */
export function getScoreEvents(
  { cursor, limit = 20 }: { cursor?: string | null; limit?: number } = {},
): Promise<ScoreEventsResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return apiFetch(`/infinite/score-events?${params}`);
}
