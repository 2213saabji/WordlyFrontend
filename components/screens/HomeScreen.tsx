"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { displayName } from "@/components/Leaderboard";
import { HomeReminderSlot } from "@/components/ReminderCards";
import { getMyGroups, getGlobalWeeklyLeaderboard, getPublicInfiniteLeaderboard } from "@/lib/api";
import { PUBLIC_BOARD_TIER } from "@/lib/tiers";
import { useSyncedResource } from "@/lib/use-synced";
import type { Group, InfiniteLeaderboardResponse, WeeklyLeaderboardEntry } from "@/types";

const GROUPS_CACHE_KEY = "home:groups";
const WEEKLY_CACHE_KEY = "home:weekly";

const LOGO_TILES = [
  { char: "G", className: "bg-accent text-background" },
  { char: "U", className: "bg-white/10" },
  { char: "E", className: "bg-white/10" },
  { char: "S", className: "bg-white/10" },
  { char: "S", className: "bg-white/10" },
  { char: "W", className: "bg-accent-2 text-background" },
  { char: "O", className: "bg-white/10" },
  { char: "R", className: "bg-white/10" },
  { char: "D", className: "bg-white/10" },
];

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

const noSubscribe = () => () => {};

/** Today's date in the viewer's locale and timezone. Empty in the server
 * render and while hydrating — the guest home is server-rendered on "/", and
 * the server's locale/timezone would otherwise mismatch the browser's. */
function useTodayLabel(): string {
  return useSyncExternalStore(noSubscribe, todayLabel, () => "");
}

/** The daily word is per UTC day, and `stats.lastPlayedDate` is set to that
 * day's date once its game is finished (won or lost). */
function playedDailyToday(lastPlayedDate: string | null | undefined) {
  return lastPlayedDate === new Date().toISOString().slice(0, 10);
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function InfinityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M6 16c5 0 7-8 12-8a4 4 0 0 1 0 8c-5 0-7-8-12-8a4 4 0 1 0 0 8" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
      <path d="M6 9a6 6 0 0 0 12 0V3H6z" />
      <path d="M10 15v3M14 15v3M7 22h10" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Shown while a widget's data is still in flight (distinct from that
 * widget's actual empty state) — a plain "Loading…" line would otherwise
 * momentarily read the same as "nothing here", or worse, share a branch
 * with the empty state and flash real empty-state copy before data arrives. */
function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3.5 border-t border-border py-3 first:border-t-0">
          <span className="h-4 w-4 flex-none rounded-full bg-white/8" />
          <span className="h-3.5 w-28 max-w-[40%] flex-1 rounded bg-white/8" />
          <span className="ml-auto h-3 w-12 flex-none rounded bg-white/8" />
        </div>
      ))}
    </>
  );
}

/** One row of the desktop leaderboard card. */
interface BoardRow {
  userId: string;
  rank: number;
  username: string;
  meta: string;
}

function toPublicRows(res: InfiniteLeaderboardResponse): { rows: BoardRow[] } {
  return {
    rows: res.leaderboard.map((e) => ({ userId: e.userId, rank: e.rank, username: displayName(e.username), meta: `${e.score} pts` })),
  };
}

/** Guest: the top 4 of the public Infinite board's starting tier (Stone —
 * the same tier /leaderboard/infinite opens on), sent without a token. Not
 * synced or cached — both are per signed-in player. Starts from `initial`
 * (the server render's copy) and is refetched on mount. undefined while
 * loading, null if it failed with nothing to show. */
function usePublicTierBoard(enabled: boolean, initial: InfiniteLeaderboardResponse | null) {
  const [board, setBoard] = useState<{ rows: BoardRow[] } | null | undefined>(() =>
    enabled && initial ? toPublicRows(initial) : undefined,
  );
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getPublicInfiniteLeaderboard({ tier: PUBLIC_BOARD_TIER, limit: 4 })
      .then((res) => {
        if (!cancelled) setBoard(toPublicRows(res));
      })
      .catch(() => {
        // Keep the server's rows if there are any.
        if (!cancelled) setBoard((current) => current ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return board;
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-3xl font-light tracking-tight md:text-4xl">{value}</span>
      <span className="text-xs text-foreground/55">{label}</span>
    </div>
  );
}

/** One of the two play buttons. `primary` gets the filled accent style:
 * Play Daily until today's word is done, then Play Infinite. */
function PlayButton({
  icon,
  label,
  primary,
  onClick,
  tour,
}: {
  icon: ReactNode;
  label: string;
  primary: boolean;
  onClick: () => void;
  /** Training spotlight target (components/Training.tsx). */
  tour?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={tour}
      className={`flex flex-1 items-center gap-3.5 rounded-2xl px-6 py-5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${
        primary
          ? "bg-accent text-background shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/35"
          : "border border-border bg-surface hover:border-accent/30 hover:shadow-md"
      }`}
    >
      <span className={primary ? "" : "text-accent"}>{icon}</span>
      <span className={`text-[17px] tracking-tight ${primary ? "font-bold" : "font-semibold"}`}>{label}</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`ml-auto size-4 ${primary ? "opacity-80" : "text-foreground/40"}`}
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}

function MenuRow({
  icon,
  label,
  meta,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3.5 border-b border-border py-4 text-left transition-[padding] duration-150 first:border-t hover:pl-1"
    >
      <span className="text-foreground/50 transition-colors group-hover:text-accent">{icon}</span>
      <span className="text-[15.5px] font-semibold">{label}</span>
      <span className="ml-auto text-xs text-foreground/50">{meta}</span>
    </button>
  );
}

export default function HomeScreen({
  onPlay,
  onPlayInfinite,
  onHistory,
  onGroups,
  onOpenLeaderboard,
  onOpenSettings,
  guest = false,
  initialPublicBoard = null,
}: {
  onPlay: () => void;
  onPlayInfinite: () => void;
  onHistory: () => void;
  onGroups: () => void;
  onOpenLeaderboard: (groupId?: string) => void;
  /** Signed in only: the reminder card's "Change" link. */
  onOpenSettings?: () => void;
  /** Signed-out visitor on "/": same screen, but Play Infinite is the
   * highlighted button, nothing personal is fetched (the board card shows
   * the public Stone tier board, fetched without a token), and the parent
   * routes every login-only action to the login screen. */
  guest?: boolean;
  /** Guest only: the board card's rows from the server render, so the
   * page's HTML has them instead of a loading skeleton. */
  initialPublicBoard?: InfiniteLeaderboardResponse | null;
}) {
  const { user } = useAuth();
  const today = useTodayLabel();
  // Cached from the last visit and only refetched when /sync reports a
  // change (lib/use-synced.ts).
  const groupsRes = useSyncedResource({
    flag: "mine",
    key: GROUPS_CACHE_KEY,
    enabled: !guest,
    // Only the top 4 are ever shown here (see the .slice(0, 4) below), but
    // `pagination.total` still reports the true count across all of the
    // user's groups regardless of the requested limit — used for the "N
    // active" label below.
    fetcher: async () => {
      const { groups, pagination } = await getMyGroups({ limit: 4 });
      return { groups, total: pagination.total };
    },
  });
  const groups: Group[] | null = groupsRes.data?.groups ?? (groupsRes.failed ? [] : null);
  const groupsTotal = groupsRes.data?.total ?? 0;
  const weekly: WeeklyLeaderboardEntry[] | null = useSyncedResource({
    flag: "weekly",
    key: WEEKLY_CACHE_KEY,
    enabled: !guest,
    // Only the top 4 are shown, so request just that.
    fetcher: async () => (await getGlobalWeeklyLeaderboard({ limit: 4 })).leaderboard,
  }).data;
  // The desktop board card: the global weekly board when signed in, the
  // Stone tier board for a guest. Rows are null while loading.
  const publicBoard = usePublicTierBoard(guest, initialPublicBoard);
  const boardRows: BoardRow[] | null = guest
    ? (publicBoard?.rows ?? null)
    : (weekly?.map((e) => ({
        userId: e.userId,
        rank: e.rank,
        username: displayName(e.username),
        meta: e.avgAttempts != null ? `avg ${e.avgAttempts.toFixed(1)}g` : `${e.gamesWon} wins`,
      })) ?? null);
  const boardFailed = guest && publicBoard === null;
  // A guest's card is still headed "Global" (the user's call) — without
  // "this week", since tier points aren't a weekly count.
  const boardTitle = guest ? "🌍 Global" : "🌍 Global · this week";
  const boardEmpty = guest ? "Nobody is on the board yet." : "Nobody has finished a game this week yet.";

  const winRate =
    user && user.stats.gamesPlayed > 0
      ? Math.round((user.stats.gamesWon / user.stats.gamesPlayed) * 100)
      : 0;

  const goToGlobalLeaderboard = () => onOpenLeaderboard();

  // Once today's daily word is finished, the headline and the highlighted
  // button point at Infinite instead.
  const dailyDone = playedDailyToday(user?.stats.lastPlayedDate);
  // A guest's one thing to do without an account is Infinite.
  const headline = guest ? (
    <>
      Play Infinite.
      <br />
      <span className="font-bold">No login.</span>
    </>
  ) : dailyDone ? (
    <>
      Daily done. Now
      <br />
      <span className="font-bold">go Infinite.</span>
    </>
  ) : (
    <>
      Today&apos;s word is
      <br />
      <span className="font-bold">waiting.</span>
    </>
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* mobile-only top strip */}
      <div className="flex items-center justify-between px-5 pt-6 md:hidden">
        <span className="min-h-4 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/50">{today}</span>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 py-8 md:grid md:grid-cols-[1.15fr_0.85fr] md:items-start md:gap-16 md:px-8 md:py-16">
        {/* left column */}
        <div className="flex flex-col gap-8">
          {/* desktop headline */}
          <div className="hidden animate-fade-in-up flex-col gap-4 md:flex">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/50">
              {today && `${today} · `}
              {guest ? "Free to play" : dailyDone ? "Daily complete" : "Daily word"}
            </span>
            <h1 className="max-w-lg text-[56px] font-light leading-[1.05] tracking-tight lg:text-[64px]">{headline}</h1>
            <p className="max-w-md text-base leading-relaxed text-foreground/65">
              {guest
                ? "Five letters, six tries, as many words as you like. Log in for the Daily word, streaks, groups and the tier leaderboard."
                : dailyDone
                  ? "A new daily word lands at midnight. Until then, Infinite has endless words: earn points and climb the tiers."
                  : "Five letters, six tries, a new word at midnight. Play alone or race the groups you're in."}
            </p>
          </div>

          {/* mobile logo + headline */}
          <div className="flex flex-col gap-5 md:hidden">
            <div className="flex gap-1.5">
              {LOGO_TILES.map((tile, i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={`flex size-7 animate-tile-bounce items-center justify-center rounded-lg text-sm font-bold ${tile.className}`}
                >
                  {tile.char}
                </span>
              ))}
            </div>
            <h1 className="animate-fade-in-up text-4xl font-light leading-tight tracking-tight" style={{ animationDelay: "120ms" }}>
              {headline}
            </h1>
          </div>

          {/* play buttons */}
          <div data-tour="home-play" className="flex animate-fade-in-up flex-col gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
            {/* A guest can only play Infinite without logging in. */}
            <PlayButton icon={<CalendarIcon />} label="Play Daily" primary={!guest && !dailyDone} onClick={onPlay} tour="home-daily" />
            <PlayButton icon={<InfinityIcon />} label="Play Infinite" primary={guest || dailyDone} onClick={onPlayInfinite} tour="home-infinite" />
          </div>

          {/* Daily reminder card / reminder set / Infinite nudge — at most one. */}
          {!guest && onOpenSettings && <HomeReminderSlot onPlayInfinite={onPlayInfinite} onOpenSettings={onOpenSettings} />}

          {/* stats */}
          {user && (
            <div
              data-tour="home-stats"
              className="grid animate-fade-in-up grid-cols-3 gap-4 border-t border-border pt-6"
              style={{ animationDelay: "240ms" }}
            >
              <Stat value={user.stats.gamesPlayed} label="Words played" />
              <Stat value={`${winRate}%`} label="Win rate" />
              <Stat value={user.stats.maxStreak} label="Best streak" />
            </div>
          )}

          {/* mobile-only menu rows */}
          <div data-tour="home-more" className="flex animate-fade-in-up flex-col md:hidden" style={{ animationDelay: "300ms" }}>
            <MenuRow
              icon={<UsersIcon />}
              label="Groups"
              meta={guest ? "Log in" : groups ? `${groupsTotal} active` : "…"}
              onClick={onGroups}
            />
            <MenuRow
              icon={<TrophyIcon />}
              label="Leaderboard"
              meta={guest ? "Infinite · tiers" : "Global · weekly"}
              onClick={goToGlobalLeaderboard}
            />
            <MenuRow
              icon={<HistoryIcon />}
              label="History"
              meta={guest ? "Log in" : user ? `${user.stats.gamesPlayed} words` : "…"}
              onClick={onHistory}
            />
          </div>
        </div>

        {/* right column — desktop only */}
        <div data-tour="home-more" className="hidden animate-fade-in-up flex-col gap-4 md:flex" style={{ animationDelay: "320ms" }}>
          <div className="flex flex-col gap-4 rounded-[26px] border border-border bg-surface p-7">
            <div className="flex items-center justify-between">
              <span className="text-[15.5px] font-semibold">{boardTitle}</span>
              <button
                type="button"
                onClick={goToGlobalLeaderboard}
                className="text-xs font-medium text-accent hover:underline"
              >
                See all
              </button>
            </div>
            <div className="flex flex-col">
              {boardRows && boardRows.length > 0 ? (
                boardRows.slice(0, 4).map((entry, i) => {
                  const isMe = entry.userId === user?.id;
                  return (
                    <div
                      key={entry.userId}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className={`flex animate-fade-in-up items-center gap-3.5 border-b border-border py-3 last:border-b-0 ${
                        isMe ? "-mx-2.5 rounded-lg bg-accent/10 px-2.5" : ""
                      }`}
                    >
                      <span className={`w-5 text-xs ${isMe ? "text-accent" : "text-foreground/50"}`}>{entry.rank}</span>
                      <span className={`text-[15px] font-semibold ${isMe ? "text-accent" : ""}`}>{entry.username}</span>
                      <span className={`ml-auto text-sm ${isMe ? "text-accent" : "text-foreground/65"}`}>{entry.meta}</span>
                    </div>
                  );
                })
              ) : boardRows ? (
                <p className="animate-fade-in py-2 text-sm text-foreground/55">{boardEmpty}</p>
              ) : boardFailed ? (
                <p className="animate-fade-in py-2 text-sm text-foreground/55">The leaderboard couldn&apos;t load right now.</p>
              ) : (
                <SkeletonRows />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[26px] border border-border bg-surface p-7">
            <span className="text-[15.5px] font-semibold">Your groups</span>
            <div className="flex flex-col">
              {guest ? (
                <p className="animate-fade-in py-1 text-sm text-foreground/55">Log in to see your groups.</p>
              ) : groups === null ? (
                <SkeletonRows />
              ) : groups.length > 0 ? (
                groups.slice(0, 4).map((group, i) => (
                  <button
                    key={group._id}
                    type="button"
                    onClick={onGroups}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="flex animate-fade-in-up items-center gap-3 border-t border-border py-3 text-left transition-[padding] duration-150 first:border-t-0 hover:pl-1"
                  >
                    <span className="text-foreground/50">
                      <UsersIcon />
                    </span>
                    <span className="text-[15px] font-semibold">{group.name}</span>
                    <span className="ml-auto text-xs text-foreground/50">
                      {group.members.length} player{group.members.length === 1 ? "" : "s"}
                    </span>
                  </button>
                ))
              ) : (
                <p className="animate-fade-in py-1 text-sm text-foreground/55">You&apos;re not in any groups yet.</p>
              )}
              <button
                type="button"
                onClick={onGroups}
                className="flex items-center gap-3 border-t border-border py-3 text-left text-accent transition-[padding] duration-150 hover:pl-1"
              >
                <PlusIcon />
                <span className="text-[15px] font-semibold">Create a connection group</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
