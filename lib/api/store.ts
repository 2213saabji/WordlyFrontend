// Coin store: packs and PayU orders. The server credits an order when PayU
// sends the player back or calls its webhook, whichever comes first; the
// app polls getCoinOrder for the outcome (lib/purchase.ts). 503
// PAYMENTS_NOT_CONFIGURED from create = the store isn't open yet.

import type { CoinOrderStatusResponse, CoinPacksResponse, CoinPurchase, CreateCoinOrderResponse } from "@/types";
import { apiFetch } from "./client";

/** Packs are server config (more can be added without a release). */
export function getCoinPacks(): Promise<CoinPacksResponse> {
  return apiFetch("/store/coin-packs");
}

/** `idempotencyKey`: a fresh UUID per tap. A retry with the same key returns
 * the same order instead of creating a second one. */
export function createCoinOrder(item: CoinPurchase, idempotencyKey: string): Promise<CreateCoinOrderResponse> {
  return apiFetch("/store/orders", {
    method: "POST",
    body: item,
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

/** 404 ORDER_NOT_FOUND for an unknown order or another player's. */
export function getCoinOrder(orderId: string): Promise<CoinOrderStatusResponse> {
  return apiFetch(`/store/orders/${encodeURIComponent(orderId)}`);
}
