// Daily / weekly leaderboards (global and per-group) for Daily mode. The
// Infinite tier leaderboard is separate — see ./infinite-tiers.

import type {
  GlobalDailyLeaderboardResponse,
  GlobalWeeklyLeaderboardResponse,
  GroupDailyLeaderboardResponse,
  GroupWeeklyLeaderboardResponse,
  LeaderboardResponse,
} from "@/types";
import { apiFetch, pageQuery, type PageOptions } from "./client";

export function getLeaderboard(id: string, options: PageOptions = {}): Promise<LeaderboardResponse> {
  return apiFetch(`/groups/${id}/leaderboard?${pageQuery(options)}`);
}

export function getGlobalDailyLeaderboard(
  options: PageOptions & { date?: string } = {},
): Promise<GlobalDailyLeaderboardResponse> {
  return apiFetch(`/leaderboard/daily?${pageQuery(options, { date: options.date })}`);
}

export function getGlobalWeeklyLeaderboard(
  options: PageOptions & { date?: string } = {},
): Promise<GlobalWeeklyLeaderboardResponse> {
  return apiFetch(`/leaderboard/weekly?${pageQuery(options, { date: options.date })}`);
}

export function getGroupDailyLeaderboard(
  id: string,
  options: PageOptions & { date?: string } = {},
): Promise<GroupDailyLeaderboardResponse> {
  return apiFetch(`/groups/${id}/leaderboard/daily?${pageQuery(options, { date: options.date })}`);
}

export function getGroupWeeklyLeaderboard(
  id: string,
  options: PageOptions & { date?: string } = {},
): Promise<GroupWeeklyLeaderboardResponse> {
  return apiFetch(`/groups/${id}/leaderboard/weekly?${pageQuery(options, { date: options.date })}`);
}
