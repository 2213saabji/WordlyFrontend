// Coin wallet: balance and the append-only ledger. Every balance change
// (solve, purchase, hint) turns the /sync `wallet` flag (and `me`, for
// /auth/me's coinBalance) true.

import type { WalletResponse, WalletTransactionsResponse } from "@/types";
import { apiFetch } from "./client";

export function getWallet(): Promise<WalletResponse> {
  return apiFetch("/wallet");
}

/** Newest first, paged by `nextCursor`. `limit` max 50. 400 INVALID_CURSOR
 * for a malformed cursor. */
export function getWalletTransactions(
  { cursor, limit = 20 }: { cursor?: string | null; limit?: number } = {},
): Promise<WalletTransactionsResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return apiFetch(`/wallet/transactions?${params}`);
}
