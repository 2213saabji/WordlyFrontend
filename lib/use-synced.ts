"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readCache, writeCache } from "@/lib/cache";
import { isFresh, markFresh, onStale, type SyncFlag } from "@/lib/sync";

// Several mounted components can show the same resource (e.g. the tier
// announcer and the Infinite hub both use "infinite:me"); a stale mark then
// triggers them all at once. They share one request per key.
const inFlight = new Map<string, { startedAt: number; promise: Promise<unknown> }>();

function sharedFetch<T>(key: string, fetcher: () => Promise<T>): { startedAt: number; promise: Promise<T> } {
  const running = inFlight.get(key);
  if (running) return running as { startedAt: number; promise: Promise<T> };
  const entry = {
    startedAt: Date.now(),
    promise: fetcher().finally(() => inFlight.delete(key)),
  };
  inFlight.set(key, entry);
  return entry;
}

/**
 * One synced API response, cached under `key` (lib/cache.ts) and covered by
 * a /sync `flag` (lib/sync.ts).
 *
 * - Renders the cached value straight away.
 * - Calls `fetcher` on mount only when there's no cached value or it's
 *   marked stale — otherwise the cache is used as is (no request).
 * - Refetches immediately if a sync marks `flag` stale while mounted.
 * - Marks it fresh only after a successful fetch; a failed one stays stale
 *   and is retried on the next mount.
 *
 * `fetcher` must reject on failure. `setData` is for applying an action's
 * own response (e.g. mark-as-read), which is also written to the cache.
 */
export function useSyncedResource<T>({
  flag,
  key,
  fetcher,
  enabled = true,
  sameDay = false,
}: {
  flag: SyncFlag;
  key: string;
  fetcher: () => Promise<T>;
  enabled?: boolean;
  sameDay?: boolean;
}) {
  const [state, setState] = useState<{ key: string; value: T | null }>(() => ({
    key,
    value: enabled ? readCache<T>(key, { sameDay }) : null,
  }));
  const [failed, setFailed] = useState(false);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // A new key (e.g. another tier's board) starts from that key's cache.
  const data = state.key === key ? state.value : enabled ? readCache<T>(key, { sameDay }) : null;

  const refetch = useCallback(async (): Promise<T | null> => {
    const { startedAt, promise } = sharedFetch(key, () => fetcherRef.current());
    try {
      const value = await promise;
      writeCache(key, value);
      markFresh(flag, key, startedAt);
      setState({ key, value });
      setFailed(false);
      return value;
    } catch {
      setFailed(true);
      return null;
    }
  }, [flag, key]);

  useEffect(() => {
    if (!enabled) return;
    if (!readCache<T>(key, { sameDay }) || !isFresh(flag, key)) void refetch();
  }, [enabled, flag, key, sameDay, refetch]);

  useEffect(() => {
    if (!enabled) return;
    return onStale((flags) => {
      // Skip data fetched after that sync started — it's already current.
      if (flags.has(flag) && !isFresh(flag, key)) void refetch();
    });
  }, [enabled, flag, key, refetch]);

  const setData = useCallback(
    (value: T) => {
      writeCache(key, value);
      setState({ key, value });
    },
    [key],
  );

  return { data, setData, failed, refetch };
}

/**
 * For screens that keep their own state around a synced API (paging,
 * optimistic updates): decides only *when* to load. Runs `load` on mount
 * when `key` has no fresh synced data, and again whenever /sync marks
 * `flag` stale while mounted. `load` fetches, applies and caches the data
 * itself, and must reject on failure (the resource then stays stale).
 */
export function useSyncedLoader({
  flag,
  key,
  load,
  enabled = true,
  sameDay = false,
}: {
  flag: SyncFlag;
  key: string;
  load: () => Promise<unknown>;
  enabled?: boolean;
  /** As readCache's: a value cached before today's UTC midnight counts as missing. */
  sameDay?: boolean;
}) {
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const run = useCallback(async () => {
    const startedAt = Date.now();
    try {
      await loadRef.current();
      markFresh(flag, key, startedAt);
    } catch {
      // Stays stale; retried on the next mount or sync.
    }
  }, [flag, key]);

  useEffect(() => {
    if (!enabled) return;
    if (!readCache(key, { sameDay }) || !isFresh(flag, key)) void run();
  }, [enabled, flag, key, sameDay, run]);

  useEffect(() => {
    if (!enabled) return;
    return onStale((flags) => {
      // Skip data fetched after that sync started — it's already current.
      if (flags.has(flag) && !isFresh(flag, key)) void run();
    });
  }, [enabled, flag, key, run]);

  return run;
}
