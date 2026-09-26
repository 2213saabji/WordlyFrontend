// Build-time feature flags. NEXT_PUBLIC_* values are inlined into the client
// bundle at build time, so changing one needs a rebuild/redeploy. Both are
// off unless explicitly "true", so a missing env var never switches
// anything on.

/** Infinite tier leaderboard (PRD Phase 1). Off = the app behaves exactly as
 * before the feature: "Play Infinite" goes straight into a round, and the
 * Infinite hub, tier leaderboard, "How tiers work" screen, the "∞ Infinite"
 * leaderboard scope and the Nav tier chip are all unreachable. Turn on once
 * the backend's tier endpoints are live. */
export const INFINITE_TIERS_ENABLED = true

/** Prize money for the Infinite tier leaderboard (PRD Phase 2) — gates every
 * money-related view and action (prize amounts, payouts, ...). Money lives
 * inside the tier feature, so it's always off while INFINITE_TIERS_ENABLED
 * is off. */
export const MONEY_ENABLED = INFINITE_TIERS_ENABLED && process.env.NEXT_PUBLIC_MONEY_ENABLED === "true";
