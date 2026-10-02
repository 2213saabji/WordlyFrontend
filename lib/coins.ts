"use client";

// The player's coin balance, shared by every coin chip. Cached + synced on
// the /sync `wallet` flag (GET /wallet). Any response that carries a fresh
// balance (a solve, a hint, a purchase) applies it at once with
// setCoinBalance, so every mounted chip updates without a refetch.

import { useEffect } from "react";
import { getWallet } from "@/lib/api";
import { writeCache } from "@/lib/cache";
import { useSyncedResource } from "@/lib/use-synced";
import type { WalletResponse } from "@/types";

const WALLET_CACHE_KEY = "wallet";

const listeners = new Set<(wallet: WalletResponse) => void>();

export function setCoinBalance(balance: number): void {
  const wallet: WalletResponse = { balance, updatedAt: new Date().toISOString() };
  writeCache(WALLET_CACHE_KEY, wallet);
  for (const listener of listeners) listener(wallet);
}

/** null until the first fetch (or cached value). */
export function useCoinBalance(): number | null {
  const { data, setData } = useSyncedResource({ flag: "wallet", key: WALLET_CACHE_KEY, fetcher: getWallet });
  useEffect(() => {
    listeners.add(setData);
    return () => {
      listeners.delete(setData);
    };
  }, [setData]);
  return data?.balance ?? null;
}
