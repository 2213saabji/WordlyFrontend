"use client";

// Buying a coin pack through PayU's hosted checkout (contract §3.2):
// create the order → post its signed form to PayU (the page navigates
// away). PayU sends the browser back through the server, which credits the
// order, to /?purchase=<orderId>&result=…; GameApp then opens the Coins
// screen and finishReturnedPurchase polls the order for the outcome. The
// server credits on the return *or* PayU's webhook, whichever lands first,
// and checks with PayU itself while the order is polled.

import { ApiRequestError, createCoinOrder, getCoinOrder } from "@/lib/api";
import { setCoinBalance } from "@/lib/coins";
import { invalidate } from "@/lib/sync";
import type { CoinOrderStatusResponse, CoinPack, CoinPurchase, CreateCoinOrderResponse } from "@/types";

const POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 2_000;
/** Where to go back to after a purchase (this tab only). */
const RETURN_KEY = "guessword_purchase_return";

/** Coin purchases aren't open yet: every Buy button shows "coming soon"
 * without calling the backend or opening checkout. Opened by
 * NEXT_PUBLIC_PURCHASES_OPEN=true (e.g. in .env.local to test checkout). */
const PURCHASES_OPEN = process.env.NEXT_PUBLIC_PURCHASES_OPEN === "true";

/** unavailable: store not open (503 PAYMENTS_NOT_CONFIGURED) · cancelled:
 * left PayU without paying · failed: the payment failed (nothing charged) ·
 * pending: paid, but the credit isn't confirmed yet (the webhook will add
 * it) · error: anything else (network, PayU unreachable). */
export type PurchaseErrorKind = "unavailable" | "cancelled" | "failed" | "pending" | "error";

export class PurchaseError extends Error {
  kind: PurchaseErrorKind;
  /** What the failed purchase was, for a "Try again" (when known). */
  retry?: CoinPurchase;
  /** failed: PayU's reason, e.g. "Bank declined" (when given). */
  reason?: string;
  constructor(kind: PurchaseErrorKind, details: { retry?: CoinPurchase; reason?: string } = {}) {
    super(PURCHASE_ERROR_COPY[kind]);
    this.name = "PurchaseError";
    this.kind = kind;
    this.retry = details.retry;
    this.reason = details.reason;
  }
}

export const PURCHASE_ERROR_COPY: Record<PurchaseErrorKind, string> = {
  unavailable: "This feature will come soon.",
  cancelled: "Payment cancelled. You weren't charged.",
  failed: "Payment didn't go through. You weren't charged.",
  pending: "We're confirming your payment. Your coins will appear shortly.",
  error: "Something went wrong. Please try again.",
};

export interface PurchaseResult {
  coinsCredited: number;
  balance: number;
  orderId: string;
}

/** The screen a purchase started from, to land back on after it. */
export type PurchaseOrigin = "coins" | "infinite";

/** `result` from the return URL: a hint for what to show while the order is
 * polled (it isn't trusted for the outcome itself). */
export type ReturnedPurchaseHint = "success" | "failed" | "cancelled" | "check";

type PayuCheckout = CreateCoinOrderResponse["gateway"]["checkout"];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Rupees in a valid custom amount, or why not ("min" | "max" | "step"). */
export function checkCustomRupees(
  rupees: number,
  rules: { minPaise: number; stepPaise: number; maxPaise: number },
): "ok" | "min" | "max" | "step" {
  const paise = Math.round(rupees * 100);
  if (!Number.isFinite(rupees) || paise < rules.minPaise) return "min";
  if (paise > rules.maxPaise) return "max";
  return paise % rules.stepPaise === 0 ? "ok" : "step";
}

/** What an order was, for buying it again. */
function retryOf(order: Pick<CoinOrderStatusResponse, "packId" | "amountPaise">): CoinPurchase {
  return order.packId === "custom" ? { amountPaise: order.amountPaise } : { packId: order.packId };
}

/**
 * Starts the purchase of a pack or a custom amount: creates the order and
 * goes to PayU. Never resolves — the page navigates away, and the result is
 * picked up on the way back (finishReturnedPurchase). Rejects with a
 * PurchaseError if it can't start, or with "cancelled" when the player comes
 * back with the Back button.
 */
export async function buyCoins(item: CoinPurchase, { from = "coins" }: { from?: PurchaseOrigin } = {}): Promise<never> {
  if (!PURCHASES_OPEN) throw new PurchaseError("unavailable");
  let order;
  try {
    // A fresh key per tap: apiFetch's one retry can't create a second order.
    order = await createCoinOrder(item, crypto.randomUUID());
  } catch (err) {
    if (err instanceof ApiRequestError && err.data?.code === "PAYMENTS_NOT_CONFIGURED") {
      throw new PurchaseError("unavailable");
    }
    throw new PurchaseError("error", { retry: item });
  }
  return goToPayu(order.orderId, order.gateway.checkout, from).catch((err: unknown) => {
    throw err instanceof PurchaseError ? new PurchaseError(err.kind, { retry: item }) : err;
  });
}

/** Posts the order's signed form to PayU's hosted checkout. Rejects with
 * "cancelled" if the player comes back with the browser's Back button (the
 * page is restored from the back/forward cache). */
function goToPayu(orderId: string, checkout: PayuCheckout, from: PurchaseOrigin): Promise<never> {
  let action: URL;
  try {
    action = new URL(checkout.action);
  } catch {
    return Promise.reject(new PurchaseError("error"));
  }
  // Only ever post to PayU.
  if (action.protocol !== "https:" || !/(^|\.)payu\.in$/.test(action.hostname)) {
    return Promise.reject(new PurchaseError("error"));
  }
  try {
    sessionStorage.setItem(RETURN_KEY, JSON.stringify({ orderId, from }));
  } catch {
    // Storage disabled: the return lands on the Coins screen.
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = action.toString();
  form.style.display = "none";
  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);

  return new Promise<never>((_, reject) => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      window.removeEventListener("pageshow", onShow);
      form.remove();
      reject(new PurchaseError("cancelled"));
    };
    window.addEventListener("pageshow", onShow);
    form.submit();
  });
}

/** Where the purchase for `orderId` started, if this tab started it. */
export function purchaseOrigin(orderId: string): PurchaseOrigin {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null") as { orderId?: string; from?: PurchaseOrigin } | null;
    return saved?.orderId === orderId && saved.from === "infinite" ? "infinite" : "coins";
  } catch {
    return "coins";
  }
}

/**
 * Back from PayU (/?purchase=<orderId>&result=<hint>): polls the order until
 * it's credited or failed, and updates every coin chip. Resolves with the
 * result and the pack bought (for the purchase-done sheet); rejects with a
 * PurchaseError carrying what to retry — "pending" if the payment isn't
 * confirmed yet (the webhook or the next poll credits it).
 */
export async function finishReturnedPurchase(
  orderId: string,
  hint: ReturnedPurchaseHint,
): Promise<{ result: PurchaseResult; pack: CoinPack }> {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // Nothing to clean up.
  }
  // A cancel or a failure needs one look (what it was, in case it was paid
  // after all); the rest wait for the credit.
  const attempts = hint === "failed" || hint === "cancelled" ? 1 : POLL_ATTEMPTS;
  let last: CoinOrderStatusResponse | null = null;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(POLL_INTERVAL_MS);
    const order = await getCoinOrder(orderId).catch((err: unknown) => {
      if (err instanceof ApiRequestError && err.status === 404) throw new PurchaseError("error");
      return null;
    });
    if (order) last = order;
    if (order?.status === "credited") {
      setCoinBalance(order.balance);
      invalidate("wallet", "me", "notifications");
      return {
        result: { coinsCredited: order.coins, balance: order.balance, orderId },
        pack: { packId: order.packId, coins: order.coins, pricePaise: order.amountPaise, currency: order.currency },
      };
    }
    if (order?.status === "failed") {
      throw new PurchaseError("failed", { retry: retryOf(order), reason: order.failureReason ?? undefined });
    }
  }
  const retry = last ? retryOf(last) : undefined;
  if (hint === "cancelled") throw new PurchaseError("cancelled", { retry });
  throw new PurchaseError(hint === "failed" ? "failed" : "pending", { retry });
}
