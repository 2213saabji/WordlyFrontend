// Build-time feature flags — changing one needs a rebuild/redeploy.

/** Infinite tier leaderboard (PRD Phase 1). Off = the app behaves exactly as
 * before the feature: "Play Infinite" goes straight into a round, and the
 * Infinite hub, tier leaderboard, "How tiers work" screen, the "∞ Infinite"
 * leaderboard scope and the Nav tier chip are all unreachable. Turn on once
 * the backend's tier endpoints are live. */
export const INFINITE_TIERS_ENABLED = true
