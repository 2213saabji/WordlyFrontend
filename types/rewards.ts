// Infinite tier leaderboard — Phase 2: Tier 1 verification and the ₹100
// monthly reward. Everything here is money-related: only render it (and
// only call lib/api/verification.ts / lib/api/rewards.ts) when MONEY_ENABLED
// is on (lib/flags.ts). Shapes follow the backend contract v0.3.

export type PayoutStatus = "pending" | "processing" | "paid" | "failed";

export interface Payout {
  cycle: number;
  amountInr: number;
  status: PayoutStatus;
  /** IST day the cycle completed. */
  eligibleDay: string;
  paidAt: string | null;
}

/** GET /rewards/me — also embedded as `reward` in GET /infinite/me for Tier 1. */
export interface RewardStatus {
  /** False while rewards are switched off: the counter still cycles, but no
   * payout is created. */
  enabled?: boolean;
  inTier1?: boolean;
  /** Day X … */
  day: number;
  /** … of Y (30). */
  of: number;
  amountInr?: number;
  /** All three verification steps are `verified`. */
  verificationComplete: boolean;
  /** Why a pending payout isn't moving. */
  blockedReason: "review_case" | "verification_pending" | null;
  payouts: Payout[];
}

export type VerificationStep = "mobile" | "email" | "bank";

/** mobile/email: `pending` = code or link sent, not yet used.
 * bank: `pending` = submitted, bank check running; `name_mismatch` = ask
 * the player to re-enter the name. */
export type VerificationItemStatus = "not_started" | "pending" | "verified" | "name_mismatch";

export interface VerificationItem {
  status: VerificationItemStatus;
  /** e.g. "+•••••••2671", "as••@example.com", "••••9012". */
  masked: string | null;
}

export interface VerificationStatusResponse {
  mobile: VerificationItem;
  email: VerificationItem & { method: "link" | "google" | null };
  bank: VerificationItem & { ifsc: string | null; nameMatch: boolean | null };
  /** A detail is already linked to another account. The step still shows
   * verified and the tier is kept, but payouts are held for review. */
  reviewCase: { status: "open"; reason: "identity_in_use"; detail: "phone" | "email" | "bank" } | null;
  /** Step to show next; null = nothing needed right now (all done, or the
   * bank check is still running). */
  nextStep: VerificationStep | null;
  /** All three steps are `verified`. */
  complete: boolean;
}

/** Every step endpoint returns the status object plus these. */
export type VerificationStepResponse = VerificationStatusResponse & {
  message?: string;
  expiresInSeconds?: number;
};

export interface BankDetailsRequest {
  accountHolderName: string;
  accountNumber: string;
  ifsc: string;
}
