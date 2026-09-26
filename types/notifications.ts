// In-app notifications for the Infinite tier leaderboard (backend contract
// v0.3, §7.2). payout_sent / payout_failed / verification_needed are
// money-only — hidden when MONEY_ENABLED is off (lib/flags.ts).
// reward_earned stays: without money it reads as a Diamond star.

import type { TierNumber } from "@/types/infinite";

export type NotificationType =
  | "promotion"
  | "demotion_risk"
  | "demotion"
  | "reward_earned"
  | "payout_sent"
  | "payout_failed"
  | "verification_needed";

export const MONEY_NOTIFICATION_TYPES: readonly NotificationType[] = [
  "payout_sent",
  "payout_failed",
  "verification_needed",
];

// ASSUMED — the contract names the types and the `data` object (e.g.
// { fromTier, toTier, oldRank, rankAtEntry }) but not the envelope fields.
// Confirm id/read/createdAt naming with the backend.
export interface AppNotification {
  id: string;
  type: NotificationType;
  data: {
    fromTier?: TierNumber;
    toTier?: TierNumber;
    oldRank?: number | null;
    rankAtEntry?: number | null;
    [key: string]: unknown;
  };
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
}
