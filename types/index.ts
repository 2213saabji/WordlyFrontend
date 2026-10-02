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

/** 202 from POST /auth/signup and 200 from /auth/signup/resend — no account
 * or token yet; the player verifies with the emailed code or link. */
export interface SignupPendingResponse {
  message: string;
  /** Lowercased by the server — use this, not what was typed. */
  email: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
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
   * PlayScreen for how an in-progress hint is fetched instead. Infinite
   * rounds include it mid-round only when it's free (hintCost 0) or already
   * revealed; otherwise it comes from POST /game/infinite/hint. */
  hint?: string;
  timeTakenMs?: number | null;

  // --- Infinite tier leaderboard fields (infinite rounds only) ---
  /** The round id (backend sends `id`; `_id` kept for older payloads). */
  id?: string;
  _id?: string;
  /** Price of this round's hint, from the player's tier: 0 free (Tiers
   * 7–8), > 0 coins (Tiers 1–6), null = hints off in this tier. */
  hintCost?: number | null;
  /** @deprecated Same as hintCost === 0 — removed next backend release. */
  hintsEnabled?: boolean;
  /** true once POST /game/infinite/hint has revealed it for this round. */
  hintRevealed?: boolean;
  /** Coins this round's hint cost (0 when free or not bought). */
  hintCoinsSpent?: number;
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
  // signup email verification
  | "EMAIL_TAKEN"
  | "SIGNUP_RATE_LIMITED"
  | "SIGNUP_CODE_INVALID"
  | "SIGNUP_CODE_ATTEMPTS"
  | "SIGNUP_INVALID"
  | "SIGNUP_NOT_FOUND"
  | "SIGNUP_LINK_INVALID"
  | "EMAIL_SEND_FAILED"
  | "INVALID_TIER"
  // hint
  | "HINTS_DISABLED_FOR_TIER"
  | "INSUFFICIENT_COINS"
  | "HINT_COST_CHANGED"
  | "NOTHING_TO_REVEAL"
  | "NO_GAME_IN_PROGRESS"
  // coin store
  | "INVALID_PACK"
  | "IDEMPOTENCY_KEY_REUSED"
  | "PAYMENTS_NOT_CONFIGURED"
  | "PAYMENT_PROVIDER_ERROR"
  | "PAYMENT_FAILED"
  | "ALREADY_CREDITED"
  | "ORDER_NOT_FOUND"
  // cursor-paged lists (wallet transactions, score events)
  | "INVALID_CURSOR"
  // removed endpoints (verification, rewards) during their 410 release
  | "GONE";

export interface ApiErrorBody {
  message: string;
  code?: ApiErrorCode;
  /** Sent with SIGNUP_RATE_LIMITED. */
  retryAfterSeconds?: number;
  game?: Game;
  /** INSUFFICIENT_COINS, HINT_COST_CHANGED, ALREADY_CREDITED. */
  balance?: number;
  /** INSUFFICIENT_COINS: the hint's price. */
  required?: number;
  /** HINT_COST_CHANGED: the current price. */
  hintCost?: number | null;
  /** ALREADY_CREDITED. */
  coinsCredited?: number;
}

export * from "@/types/infinite";
export * from "@/types/coins";
export * from "@/types/notifications";
