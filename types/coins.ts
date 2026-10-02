// Coins: the per-player wallet, its ledger, and the coin store (contract
// v0.4, docs/COINS_HINTS_CONTRACT.md in the backend). Coin amounts are
// integers; money is in paise. See lib/api/wallet.ts and lib/api/store.ts.

import type { TierNumber } from "@/types/infinite";

/** GET /wallet. A player with no wallet yet: balance 0, updatedAt null. */
export interface WalletResponse {
  balance: number;
  updatedAt: string | null;
}

export type CoinTransactionType = "earn_solve" | "purchase" | "hint_spend" | "refund" | "adjustment";

export interface CoinTransaction {
  id: string;
  type: CoinTransactionType;
  /** Signed: +10 for a solve, −1000 for a hint. */
  amount: number;
  balanceAfter: number;
  /** earn_solve: { gameId, mode, tier } · purchase: { orderId, packId } ·
   * hint_spend: { gameId, tier }. */
  ref: {
    gameId?: string;
    mode?: "daily" | "infinite";
    tier?: TierNumber;
    orderId?: string;
    packId?: string;
  } | null;
  createdAt: string;
}

/** Newest first. `nextCursor` is null on the last page. */
export interface WalletTransactionsResponse {
  items: CoinTransaction[];
  nextCursor: string | null;
}

export interface CoinPack {
  packId: string;
  coins: number;
  /** GST inclusive. */
  pricePaise: number;
  currency: string;
}

export interface CoinPacksResponse {
  packs: CoinPack[];
}

export type CoinOrderStatus = "created" | "paid" | "credited" | "failed" | "expired";

export interface CoinOrder {
  orderId: string;
  status: CoinOrderStatus;
  packId: string;
  coins: number;
  amountPaise: number;
  currency: string;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  creditedAt: string | null;
}

/** POST /store/orders — `gateway` is what Razorpay Checkout opens with. */
export interface CreateCoinOrderResponse extends CoinOrder {
  gateway: {
    provider: "razorpay";
    orderId: string;
    key: string;
    amountPaise: number;
    currency: string;
  };
}

/** GET /store/orders/{orderId} — for polling when confirm didn't get through. */
export interface CoinOrderStatusResponse extends CoinOrder {
  balance: number;
}

/** POST /store/orders/{orderId}/confirm. A 409 ALREADY_CREDITED carries the
 * same coinsCredited/balance and means success too. */
export interface ConfirmCoinOrderResponse {
  status: "credited";
  orderId: string;
  coinsCredited: number;
  balance: number;
}

/** On the guess response that ends a Daily or Infinite game. `awarded` is 0
 * for a loss, or when the game was already credited. */
export interface CoinsAwarded {
  awarded: number;
  balance: number;
}
