// MONEY — Phase 2: the Tier 1 ₹100 reward tracker and payout history. Only
// call this when MONEY_ENABLED is on (lib/flags.ts). 403 TIER1_REQUIRED
// unless the caller is in Tier 1 or has an open payout.

import type { RewardStatus } from "@/types";
import { apiFetch } from "./client";

/** Day X of 30, verification state, any payout block, and payout history. */
export function getRewards(): Promise<RewardStatus> {
  return apiFetch("/rewards/me");
}
