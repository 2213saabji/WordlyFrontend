// Refetch only what changed (GET /sync, API_DOCUMENTATION.md §8).
//
// Every cached API response (lib/cache.ts) is a *resource* — a (flag, cache
// key) pair, e.g. ("infinite", "infinite:me") or ("mine", "home:groups").
// Each has a fresh/stale mark. A screen shows its cached data and only calls
// the API when the resource is missing or stale; runSync() marks resources
// stale when the server says their flag changed.
//
// The one rule that matters (§4): a `true` flag marks *every* resource
// under it stale — even ones the current screen doesn't use — and the mark
// stays until a refetch succeeds. The new token already counts that API as
// fetched, so dropping the flag would lose the change.
//
// State lives in the cache store, so clearCache() on logout (AuthProvider)
// wipes the token and the marks with the data. The token is also keyed by
// user id and never sent for another account.

import { getSync, type SyncFlag } from "@/lib/api";
import { readCache, writeCache } from "@/lib/cache";

export type { SyncFlag };

const TOKEN_KEY = "sync:token";
const RESOURCES_KEY = "sync:resources";
/** Route changes and tab focus sync at most this often (app start and
 * sign-in always sync). */
const MIN_INTERVAL_MS = 15_000;

interface Resource {
  flag: SyncFlag;
  stale: boolean;
  /** When the last successful fetch *started* (epoch ms). */
  fetchedAt: number;
}

type Resources = Record<string, Resource>;

let userId: string | null = null;
let inFlight: Promise<void> | null = null;
let lastSyncAt = 0;
const listeners = new Set<(flags: Set<SyncFlag>) => void>();

function resourceId(flag: SyncFlag, key: string): string {
  return `${flag}|${key}`;
}

function readResources(): Resources {
  return readCache<Resources>(RESOURCES_KEY) ?? {};
}

function writeResources(r: Resources): void {
  writeCache(RESOURCES_KEY, r);
}

function readToken(): string | null {
  const saved = readCache<{ userId: string; token: string }>(TOKEN_KEY);
  // Never send one account's token for another — treat it as a first sync.
  return saved && saved.userId === userId ? saved.token : null;
}

function notify(flags: Set<SyncFlag>): void {
  if (flags.size === 0) return;
  for (const listener of listeners) listener(flags);
}

/** True when `key`'s cached data can be shown without calling the API. */
export function isFresh(flag: SyncFlag, key: string): boolean {
  if (!userId) return false;
  const r = readResources()[resourceId(flag, key)];
  return !!r && !r.stale;
}

/** Records a successful fetch that started at `startedAt` (take it with
 * Date.now() *before* sending the request). */
export function markFresh(flag: SyncFlag, key: string, startedAt: number): void {
  const all = readResources();
  all[resourceId(flag, key)] = { flag, stale: false, fetchedAt: startedAt };
  writeResources(all);
}

/** After the player's own action (join a group, finish a game, rename…):
 * marks every resource under these flags stale so the next screen that
 * shows them refetches. Doesn't refetch anything now — the current screen
 * already applied the action's own response. */
export function invalidate(...flags: SyncFlag[]): void {
  const set = new Set(flags);
  const all = readResources();
  for (const r of Object.values(all)) if (set.has(r.flag)) r.stale = true;
  writeResources(all);
}

/** Subscribe to flags turning stale (from a sync, or a failed one). Returns
 * the unsubscribe function. */
export function onStale(listener: (flags: Set<SyncFlag>) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Marks every resource under these flags stale and tells subscribers. */
function markStale(flags: Set<SyncFlag>, syncStartedAt: number): void {
  const all = readResources();
  for (const r of Object.values(all)) {
    // A fetch that started after this sync request did is at least as new
    // as what the sync reported — keep it (avoids refetching everything
    // twice on the first sync after sign-in).
    if (flags.has(r.flag) && r.fetchedAt < syncStartedAt) r.stale = true;
  }
  writeResources(all);
  notify(flags);
}

const ALL_FLAGS: SyncFlag[] = [
  "me",
  "mine",
  "notifications",
  "infinite",
  "tierChanges",
  "wallet",
  "today",
  "tiers",
  "daily",
  "weekly",
  "infiniteBoard",
];

/** Asks GET /sync what changed and marks those resources stale. Reuses a
 * running sync; `force` skips the 15 s throttle (app start, sign-in). */
export function runSync({ force = false }: { force?: boolean } = {}): Promise<void> {
  if (!userId) return Promise.resolve();
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastSyncAt < MIN_INTERVAL_MS) return Promise.resolve();

  const forUser = userId;
  const startedAt = Date.now();
  lastSyncAt = startedAt;
  inFlight = getSync(readToken())
    .then((res) => {
      if (userId !== forUser) return; // signed out / switched meanwhile
      const changed = new Set(ALL_FLAGS.filter((f) => res.changed[f]));
      markStale(changed, startedAt);
      writeCache(TOKEN_KEY, { userId: forUser, token: res.syncToken });
    })
    .catch(() => {
      // Sync unavailable: fall back to normal fetching — everything is
      // stale until a refetch succeeds.
      if (userId === forUser) markStale(new Set(ALL_FLAGS), startedAt);
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Called by AuthProvider whenever the signed-in account changes. The
 * cache (token + marks) is already cleared on logout; this only stops a
 * token from being used for a different account. */
export function setSyncUser(id: string | null): void {
  if (id === userId) return;
  userId = id;
  inFlight = null;
  lastSyncAt = 0;
}
