// GET /sync — "what changed since I last looked?" (API_DOCUMENTATION.md §8).
// The app-side stale/fresh bookkeeping lives in lib/sync.ts.

import { apiFetch } from "./client";

export type SyncFlag =
  | "me"
  | "mine"
  | "notifications"
  | "infinite"
  | "tierChanges"
  | "rewards"
  | "today"
  | "tiers"
  | "daily"
  | "weekly"
  | "infiniteBoard";

export interface SyncResponse {
  /** Opaque (~500 chars, URL-safe) — store it and send it back as `since`. */
  syncToken: string;
  changed: Partial<Record<SyncFlag, boolean>>;
}

/** No `since` (or a broken/expired one) = first sync: every flag true. */
export function getSync(since?: string | null): Promise<SyncResponse> {
  return apiFetch(since ? `/sync?since=${encodeURIComponent(since)}` : "/sync");
}
