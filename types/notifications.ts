// In-app notifications (backend contract v0.3 §7.2, types updated by v0.4).
// The removed reward/payout/verification types are no longer listed by the
// server.

import type { TierNumber } from "@/types/infinite";

export type NotificationType =
  | "promotion"
  | "demotion_risk"
  | "demotion"
  | "coins_purchased"
  | "payment_failed"
  | "points_decayed";

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
    /** promotion / demotion */
    carriedPoints?: number;
    penalty?: number;
    entryPoints?: number;
    /** demotion_risk */
    demotionPenalty?: number;
    /** coins_purchased / payment_failed */
    orderId?: string;
    coins?: number;
    balance?: number;
    amountPaise?: number;
    /** points_decayed: `points` negative, over `days` idle days, `day` = latest. */
    points?: number;
    days?: number;
    day?: string;
    tier?: TierNumber;
    [key: string]: unknown;
  };
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
}
