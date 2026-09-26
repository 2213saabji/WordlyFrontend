// Stale-while-revalidate cache for the game app, kept in localStorage so it
// survives a hard refresh. Screens seed their initial state from here and
// render the last-known data straight away, then overwrite it with whatever
// the network returns — no full-screen loader or flicker on every reload.
//
// It's per-signed-in-user data (stats, groups, games), so AuthProvider
// clears all of it whenever the session ends — see clearCache().

const PREFIX = "guessword_cache:";

interface Entry {
  /** UTC date (YYYY-MM-DD) the value was written on. */
  d: string;
  v: unknown;
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `sameDay` discards anything written before today's UTC midnight — for
 * data tied to the daily word (today's game, daily leaderboards), where
 * yesterday's value would be wrong rather than just slightly stale. */
export function readCache<T>(key: string, { sameDay = false }: { sameDay?: boolean } = {}): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry;
    if (sameDay && entry.d !== utcToday()) return null;
    return entry.v as T;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const entry: Entry = { d: utcToday(), v: value };
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Quota exceeded / storage disabled — caching is best-effort only.
  }
}

export function clearCache(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // Storage disabled — nothing to clear.
  }
}
