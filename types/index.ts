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

export interface Game {
  mode?: "daily" | "infinite";
  date: string;
  status: GameStatus;
  attemptsUsed: number;
  attemptsRemaining: number;
  guesses: Guess[];
  word?: string;
  timeTakenMs?: number | null;
}

export interface LeaderboardEntry {
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
}

export interface GlobalWeeklyLeaderboardResponse {
  week: { start: string; end: string };
  leaderboard: WeeklyLeaderboardEntry[];
}

export interface GroupDailyLeaderboardResponse {
  group: { id: string; name: string };
  date: string;
  leaderboard: DailyLeaderboardEntry[];
}

export interface GroupWeeklyLeaderboardResponse {
  group: { id: string; name: string };
  week: { start: string; end: string };
  leaderboard: WeeklyLeaderboardEntry[];
}

export interface ApiErrorBody {
  message: string;
  game?: Game;
}
