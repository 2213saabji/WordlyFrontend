"use client";

// Buying a coin pack through Razorpay Checkout (contract v0.4 §5.4):
// create the order → open Checkout → confirm with Razorpay's payment id and
// signature. The server credits on confirm *or* the gateway webhook,
// whichever lands first, so 409 ALREADY_CREDITED is a success and a confirm
// lost on the network is recovered by polling the order.

import { ApiRequestError, confirmCoinOrder, createCoinOrder, getCoinOrder } from "@/lib/api";
import { setCoinBalance } from "@/lib/coins";
import { invalidate } from "@/lib/sync";
import { formatCoins } from "@/lib/tiers";
import type { CoinPack } from "@/types";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2_000;

/** unavailable: store not open (503 PAYMENTS_NOT_CONFIGURED) · cancelled:
 * Checkout closed without a payment attempt · failed: a payment attempt
 * failed or didn't verify (nothing charged) · pending: paid, but the credit
 * isn't confirmed yet (the webhook will add it) · error: anything else
 * (network, gateway down). */
export type PurchaseErrorKind = "unavailable" | "cancelled" | "failed" | "pending" | "error";

export class PurchaseError extends Error {
  kind: PurchaseErrorKind;
  /** failed: Razorpay's own reason for the last failed attempt, if any. */
  reason?: string;
  constructor(kind: PurchaseErrorKind, reason?: string) {
    super(reason ? `${PURCHASE_ERROR_COPY[kind]} ${reason}` : PURCHASE_ERROR_COPY[kind]);
    this.name = "PurchaseError";
    this.kind = kind;
    this.reason = reason;
  }
}

export const PURCHASE_ERROR_COPY: Record<PurchaseErrorKind, string> = {
  unavailable: "Buying coins is coming soon.",
  cancelled: "Payment cancelled. You weren't charged.",
  failed: "Payment didn't go through. You weren't charged.",
  pending: "We're confirming your payment. Your coins will appear shortly.",
  error: "Something went wrong. Please try again.",
};

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** The `payment.failed` event payload (only the part we read). */
interface RazorpayFailure {
  error?: { description?: string; reason?: string };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: RazorpayFailure) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

export interface PurchaseResult {
  coinsCredited: number;
  balance: number;
  orderId: string;
}

let scriptPromise: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new PurchaseError("error"));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Runs the whole purchase. Resolves once the coins are credited (and
 * every coin chip shows the new balance); rejects with a PurchaseError. */
export async function buyCoinPack(
  pack: CoinPack,
  { email }: { email?: string } = {},
): Promise<PurchaseResult> {
  let order;
  try {
    // A fresh key per tap: apiFetch's one retry can't create a second order.
    order = await createCoinOrder(pack.packId, crypto.randomUUID());
  } catch (err) {
    if (err instanceof ApiRequestError && err.data?.code === "PAYMENTS_NOT_CONFIGURED") {
      throw new PurchaseError("unavailable");
    }
    throw new PurchaseError("error");
  }

  await loadCheckout();
  const payment = await new Promise<RazorpaySuccess>((resolve, reject) => {
    const Razorpay = window.Razorpay;
    if (!Razorpay) {
      reject(new PurchaseError("error"));
      return;
    }
    // null = no failed attempt yet; "" = failed without a description.
    let lastFailure: string | null = null;
    const rzp = new Razorpay({
      key: order.gateway.key,
      order_id: order.gateway.orderId,
      amount: order.gateway.amountPaise,
      currency: order.gateway.currency,
      name: "GuessWord",
      description: formatCoins(order.coins),
      prefill: email ? { email } : undefined,
      theme: { color: "#f2a05c" },
      handler: resolve,
      // A failed attempt keeps Checkout open for a retry (Razorpay shows its
      // own error there); closing it means nothing was charged — reported
      // as a failure if an attempt failed, else as a cancel.
      modal: {
        ondismiss: () =>
          reject(lastFailure !== null ? new PurchaseError("failed", lastFailure || undefined) : new PurchaseError("cancelled")),
      },
    });
    rzp.on("payment.failed", (response) => {
      const description = response.error?.description?.trim() ?? "";
      lastFailure = description && !/^undefined$/i.test(description) ? description : "";
    });
    rzp.open();
  });

  const credited = await confirm(order.orderId, payment).catch(async (err: unknown) => {
    if (err instanceof PurchaseError) throw err;
    // Lost on the network (or a 5xx): the webhook credits it — poll.
    for (let i = 0; i < POLL_ATTEMPTS; i++) {
      await sleep(POLL_INTERVAL_MS);
      const status = await getCoinOrder(order.orderId).catch(() => null);
      if (status?.status === "credited") return { coinsCredited: status.coins, balance: status.balance, orderId: order.orderId };
      if (status?.status === "failed") throw new PurchaseError("failed");
    }
    throw new PurchaseError("pending");
  });

  setCoinBalance(credited.balance);
  invalidate("wallet", "me", "notifications");
  return credited;
}

async function confirm(orderId: string, payment: RazorpaySuccess): Promise<PurchaseResult> {
  try {
    const res = await confirmCoinOrder(orderId, {
      gatewayPaymentId: payment.razorpay_payment_id,
      signature: payment.razorpay_signature,
    });
    return { coinsCredited: res.coinsCredited, balance: res.balance, orderId };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      const code = err.data?.code;
      // The webhook got there first — same outcome.
      if (code === "ALREADY_CREDITED" && err.data?.balance !== undefined) {
        return { coinsCredited: err.data.coinsCredited ?? 0, balance: err.data.balance, orderId };
      }
      if (code === "PAYMENT_FAILED") throw new PurchaseError("failed");
      if (code === "PAYMENTS_NOT_CONFIGURED") throw new PurchaseError("unavailable");
      if (err.status < 500) throw new PurchaseError("error");
    }
    throw err;
  }
}
