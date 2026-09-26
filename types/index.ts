import type { TierNumber } from "@/types/infinite";

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  lastWinDate: string | null;
}

export interface Group {
  _id: string;
  name: string;
  inviteCode: string;
  owner: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  stats: UserStats;
  groups: Group[] | string[];
  /** Header badge for the Infinite tier leaderboard. Absent before the
   * player's first completed Infinite game (and on older backends). */
  infinite?: { tier: TierNumber; tierName: string };
}

export interface AuthResponse {
  token: string;
  deviceId: string;
  user: User;
}

/** 1 = correct spot, -1 = wrong spot, 0 = not in word */
export type LetterResult = 1 | -1 | 0;

export interface Guess {
  guess: string;
  result: LetterResult[];
}

export type GameStatus = "in-progress" | "won" | "lost" | "abandoned";

export type GameDifficulty = "easy" | "medium" | "hard";

export interface Game {
  mode?: "daily" | "infinite";
  date: string;
  status: GameStatus;
  attemptsUsed: number;
  attemptsRemaining: number;
  guesses: Guess[];
  word?: string;
  difficulty?: GameDifficulty;
  /** Only present once the round is over — see the hint-button note in
   * PlayScreen for how an in-progress hint is fetched instead. For Infinite
   * rounds, an in-progress hint comes only from POST /game/infinite/hint. */
  hint?: string;
  timeTakenMs?: number | null;

  // --- Infinite tier leaderboard fields (infinite rounds only) ---
  // ASSUMED field name — the heartbeat needs the round's id as `gameId`, but
  // the contract doesn't say which field of the game payload carries it.
  // Confirm with the backend. Both spellings are read (see useInfiniteTier).
  id?: string;
  _id?: string;
  /** false in Tiers 1–6 — hide the hint control entirely. */
  hintsEnabled?: boolean;
  /** true once POST /game/infinite/hint has revealed it for this round. */
  hintRevealed?: boolean;
  /** Present on history entries once the round is scored. */
  pointsAwarded?: number;
  /** IST day the round counted toward (a game finished after midnight
   * counts for the new day). */
  countedDay?: string;
  tierAtCompletion?: TierNumber;
}

/** Shared by every paginated group leaderboard endpoint. `page` is clamped
 * server-side to the last valid page, so an out-of-range request never
 * comes back with an empty array unless the group truly has zero ranked
 * entries — check `page >= totalPages` to know there's nothing more to load,
 * not an empty `leaderboard`. */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  winRate: number;
}

export interface LeaderboardResponse {
  group: { id: string; name: string; inviteCode: string };
  leaderboard: LeaderboardEntry[];
  pagination: Pagination;
}

export interface DailyLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  status: "won" | "lost";
  attemptsUsed: number;
  timeTakenMs: number | null;
}

export interface WeeklyLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  avgAttempts: number | null;
  avgTimeMs: number | null;
}

export interface GlobalDailyLeaderboardResponse {
  date: string;
  leaderboard: DailyLeaderboardEntry[];
  pagination: Pagination;
}

export interface GlobalWeeklyLeaderboardResponse {
  week: { start: string; end: string };
  leaderboard: WeeklyLeaderboardEntry[];
  pagination: Pagination;
}

export interface GroupDailyLeaderboardResponse {
  group: { id: string; name: string };
  date: string;
  leaderboard: DailyLeaderboardEntry[];
  pagination: Pagination;
  /** The caller's own ranked entry, returned regardless of which page was
   * requested — null if they haven't finished today's game yet. Only treat
   * it as already shown in `leaderboard` when its rank actually falls
   * within the loaded pages (see the Leaderboard component). */
  me: DailyLeaderboardEntry | null;
}

export interface GroupWeeklyLeaderboardResponse {
  group: { id: string; name: string };
  week: { start: string; end: string };
  leaderboard: WeeklyLeaderboardEntry[];
  pagination: Pagination;
}

/** Machine-readable `code` on error bodies — branch on this, never on
 * `message` text. */
export type ApiErrorCode =
  | "HINTS_DISABLED_FOR_TIER"
  | "TIER1_REQUIRED"
  | "PHONE_INVALID"
  | "OTP_INVALID"
  | "OTP_RATE_LIMITED"
  | "OTP_SEND_FAILED"
  | "SMS_PROVIDER_NOT_CONFIGURED"
  | "EMAIL_RATE_LIMITED"
  | "EMAIL_SEND_FAILED"
  | "VERIFICATION_TOKEN_INVALID"
  | "BANK_NAME_INVALID"
  | "BANK_ACCOUNT_INVALID"
  | "IFSC_INVALID"
  | "VERIFICATION_INCOMPLETE"
  | "INVALID_TIER";

export interface ApiErrorBody {
  message: string;
  code?: ApiErrorCode;
  /** Sent with OTP_RATE_LIMITED and EMAIL_RATE_LIMITED. */
  retryAfterSeconds?: number;
  game?: Game;
}

export * from "@/types/infinite";
export * from "@/types/rewards";
export * from "@/types/notifications";
