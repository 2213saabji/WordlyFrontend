// Groups — create/join/leave and the caller's group list. Group
// leaderboards live in ./leaderboards.

import type { Group, Pagination } from "@/types";
import { apiFetch, pageQuery, type PageOptions } from "./client";

export function createGroup(name: string): Promise<{ group: Group }> {
  return apiFetch("/groups", { method: "POST", body: { name } });
}

// Docs describe the response as "the updated group object" without a wrapper,
// but every sibling endpoint wraps in { group }; normalize to accept either.
export async function joinGroup(code: string): Promise<Group> {
  const data = await apiFetch<Group | { group: Group }>(
    `/groups/join/${encodeURIComponent(code)}`,
    { method: "POST" },
  );
  return "group" in data ? data.group : data;
}

export function getMyGroups(options: PageOptions = {}): Promise<{ groups: Group[]; pagination: Pagination }> {
  return apiFetch(`/groups/mine?${pageQuery(options)}`);
}

export function leaveGroup(id: string): Promise<{ message: string }> {
  return apiFetch(`/groups/${id}/leave`, { method: "POST" });
}
