// Coin store: packs and Razorpay-backed orders. Coins are credited by the
// confirm call or the gateway webhook, whichever reaches the server first —
// so confirm's 409 ALREADY_CREDITED is a success, and a confirm lost on the
// network can be recovered by polling getCoinOrder. 503
// PAYMENTS_NOT_CONFIGURED from create/confirm = the store isn't open yet.

import type {
  CoinOrderStatusResponse,
  CoinPacksResponse,
  ConfirmCoinOrderResponse,
  CreateCoinOrderResponse,
} from "@/types";
import { apiFetch } from "./client";

/** Packs are server config (more can be added without a release). */
export function getCoinPacks(): Promise<CoinPacksResponse> {
  return apiFetch("/store/coin-packs");
}

/** `idempotencyKey`: a fresh UUID per tap. A retry with the same key returns
 * the same order instead of creating a second one. */
export function createCoinOrder(packId: string, idempotencyKey: string): Promise<CreateCoinOrderResponse> {
  return apiFetch("/store/orders", {
    method: "POST",
    body: { packId },
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

/** 404 ORDER_NOT_FOUND for an unknown order or another player's. */
export function getCoinOrder(orderId: string): Promise<CoinOrderStatusResponse> {
  return apiFetch(`/store/orders/${encodeURIComponent(orderId)}`);
}

/** Send Razorpay's razorpay_payment_id and razorpay_signature from the
 * Checkout success handler. 402 PAYMENT_FAILED = signature didn't verify. */
export function confirmCoinOrder(
  orderId: string,
  payment: { gatewayPaymentId: string; signature: string },
): Promise<ConfirmCoinOrderResponse> {
  return apiFetch(`/store/orders/${encodeURIComponent(orderId)}/confirm`, { method: "POST", body: payment });
}
