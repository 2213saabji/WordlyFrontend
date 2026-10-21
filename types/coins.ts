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

/** The rules for a player-chosen amount: minPaise up to maxPaise, in steps
 * of stepPaise, at coinsPerRupee (300 = the ₹10 pack's rate). */
export interface CustomCoinAmount {
  minPaise: number;
  stepPaise: number;
  maxPaise: number;
  coinsPerRupee: number;
  currency: string;
}

export interface CoinPacksResponse {
  packs: CoinPack[];
  /** null (or missing, on older backends) = no custom amounts. */
  custom?: CustomCoinAmount | null;
}

/** What to buy: a pack, or a custom amount (POST /store/orders). */
export type CoinPurchase = { packId: string } | { amountPaise: number };

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
  /** PayU's reason for the last failed attempt, if any. */
  failureReason?: string | null;
}

/** POST /store/orders — `gateway.checkout` is the signed form to post to
 * PayU's hosted checkout (`action` is the PayU URL). */
export interface CreateCoinOrderResponse extends CoinOrder {
  gateway: {
    provider: "payu";
    /** = orderId (PayU's txnid). */
    orderId: string;
    key: string;
    amountPaise: number;
    currency: string;
    checkout: { action: string; fields: Record<string, string> };
  };
}

/** GET /store/orders/{orderId} — polled after PayU sends the player back. */
export interface CoinOrderStatusResponse extends CoinOrder {
  balance: number;
}

/** On the guess response that ends a Daily or Infinite game. `awarded` is 0
 * for a loss, or when the game was already credited. */
export interface CoinsAwarded {
  awarded: number;
  balance: number;
}
