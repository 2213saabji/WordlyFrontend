"use client";

import { useCallback, useEffect, useState } from "react";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import TierBadge from "@/components/TierBadge";
import {
  ChevronDownIcon,
  GROUPS_CACHE_KEY,
  LOAD_MORE_LOOKAHEAD,
  PodiumCard,
  ScopeSwitcher,
  initial,
  useNearBottomScroll,
  useSentinelRef,
  type NormalizedEntry,
} from "@/components/Leaderboard";
import {
  ApiRequestError,
  getInfiniteLeaderboard,
  getInfiniteMe,
  getInfiniteTiers,
  getMyGroups,
  getPublicInfiniteLeaderboard,
  getPublicInfiniteTiers,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { readCache, writeCache } from "@/lib/cache";
import { MONEY_ENABLED } from "@/lib/flags";
import { formatInr } from "@/lib/tiers";
import type {
  Group,
  InfiniteLeaderboardEntry,
  InfiniteLeaderboardResponse,
  InfiniteMeResponse,
  InfiniteTiersResponse,
  TierDefinition,
  TierNumber,
} from "@/types";

const PAGE_SIZE = 20;
// Shared with InfiniteHubScreen, so either screen seeds the other.
const ME_CACHE_KEY = "infinite:me";
const TIERS_CACHE_KEY = "infinite:tiers";
const MUTED = "text-[#9a8aa2]";
const DIAMOND_TEXT = "text-[#9fd4e6]";

function boardCacheKey(tier: TierNumber | undefined): string {
  return `infinite:board:${tier ?? "mine"}`;
}

const fmt = (n: number) => n.toLocaleString("en-IN");

/** The Infinite tier leaderboard: one ranked board per tier (1–8), defaulting
 * to the caller's own, with their row pinned when it's below what's loaded.
 * The Diamond reward line only shows when MONEY_ENABLED is on. */
export default function TierLeaderboard({
  initialTier,
  onBack,
  onSwitchScope,
  publicView,
}: {
  /** Omitted = the caller's own tier (server default); Diamond when public. */
  initialTier?: TierNumber;
  onBack: () => void;
  /** Leave for the Daily-mode leaderboard (Global, or a group). */
  onSwitchScope?: (groupId?: string) => void;
  /** The signed-out /leaderboard/infinite page: public endpoints only, no
   * pinned row or scope switcher, and a "Sign in to play" call to action. */
  publicView?: { signedIn: boolean; onCta: () => void };
}) {
  const { user } = useAuth();
  const isPublic = !!publicView;
  const startTier = initialTier ?? (isPublic ? 1 : undefined);
  const cacheKeyFor = (t: TierNumber | undefined) => (isPublic ? `infinite:public-board:${t}` : boardCacheKey(t));
  const [tier, setTier] = useState<TierNumber | undefined>(startTier);
  const [board, setBoard] = useState<InfiniteLeaderboardResponse | null>(() =>
    readCache<InfiniteLeaderboardResponse>(cacheKeyFor(startTier)),
  );
  const [tiers, setTiers] = useState<InfiniteTiersResponse | null>(() =>
    readCache<InfiniteTiersResponse>(TIERS_CACHE_KEY),
  );
  const [me, setMe] = useState<InfiniteMeResponse | null>(() => readCache<InfiniteMeResponse>(ME_CACHE_KEY));
  const [groups, setGroups] = useState<Group[] | null>(() => readCache<Group[]>(GROUPS_CACHE_KEY));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (isPublic ? getPublicInfiniteTiers() : getInfiniteTiers())
      .then((res) => {
        setTiers(res);
        writeCache(TIERS_CACHE_KEY, res);
      })
      .catch(() => {});
    if (isPublic) return;
    getInfiniteMe()
      .then((res) => {
        setMe(res);
        writeCache(ME_CACHE_KEY, res);
      })
      .catch(() => {});
    getMyGroups({ limit: 100 })
      .then(({ groups }) => {
        setGroups(groups);
        writeCache(GROUPS_CACHE_KEY, groups);
      })
      .catch(() => setGroups((prev) => prev ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fetchBoard(t: TierNumber | undefined, page: number) {
    return isPublic
      ? getPublicInfiniteLeaderboard({ tier: t ?? 1, page, limit: PAGE_SIZE })
      : getInfiniteLeaderboard({ tier: t, page, limit: PAGE_SIZE });
  }

  useEffect(() => {
    let cancelled = false;
    fetchBoard(tier, 1)
      .then((res) => {
        writeCache(cacheKeyFor(tier), res);
        if (tier === undefined) writeCache(cacheKeyFor(res.tier), res);
        if (cancelled) return;
        setBoard(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  function selectTier(next: TierNumber) {
    if (next === (tier ?? board?.tier)) return;
    setTier(next);
    setBoard(readCache<InfiniteLeaderboardResponse>(cacheKeyFor(next)));
    setError(null);
    setLoadingMore(false);
  }

  const canLoadMore = !!board && board.pagination.page < board.pagination.totalPages;

  const loadMore = useCallback(() => {
    if (!board || loadingMore || board.pagination.page >= board.pagination.totalPages) return;
    setLoadingMore(true);
    fetchBoard(board.tier, board.pagination.page + 1)
      .then((next) => {
        setBoard((latest) =>
          latest && latest.tier === next.tier
            ? { ...latest, leaderboard: [...latest.leaderboard, ...next.leaderboard], pagination: next.pagination }
            : latest,
        );
      })
      .catch(() => {
        // Keep what's shown; the sentinel retries next time it's visible.
      })
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, loadingMore]);

  const sentinelRef = useSentinelRef(loadMore, canLoadMore);
  useNearBottomScroll(loadMore, canLoadMore);

  const viewedTier = board?.tier ?? tier;
  const def = tiers?.tiers.find((t) => t.tier === viewedTier);
  const topTier = tiers?.tiers.find((t) => t.tier === 1);
  const daysToStick = def?.daysToStick;
  const tierName = board?.tierName ?? def?.name ?? "";
  const totalPlayers = board?.pagination.total ?? 0;

  // Public: Global/group boards need an account, so there's nothing to switch
  // to — just the scope label.
  const scopeSwitcher =
    isPublic || !onSwitchScope ? (
      <span className="rounded-xl border border-border px-4 py-2.5 text-sm text-foreground/70">Infinite</span>
    ) : (
      <ScopeSwitcher
        currentLabel="Infinite"
        groups={groups}
        onSelectGlobal={() => onSwitchScope(undefined)}
        onSelectGroup={(id) => onSwitchScope(id)}
      />
    );
  const cta = publicView && (
    <div className="flex flex-col gap-3 rounded-[18px] border border-accent/35 bg-accent/10 p-[18px] md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-3xl md:px-7 md:py-6">
      <span className="flex flex-col gap-3 md:gap-1">
        <span className="text-[15px] font-semibold md:text-lg">
          {publicView.signedIn ? "Climb this board" : "Want a spot on this board?"}
        </span>
        <span className="text-[13px] leading-normal text-[#c9bfcc] md:text-sm">
          {publicView.signedIn
            ? "Every completed Infinite game counts toward your tier."
            : `Everyone starts in ${tiers?.tiers.find((t) => t.tier === 8)?.name ?? "Stone"}. Sign in and complete a game to join.`}
        </span>
      </span>
      <button
        type="button"
        onClick={publicView.onCta}
        className="whitespace-nowrap rounded-[14px] bg-accent p-3.5 text-[15px] font-bold text-background transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 md:px-[26px]"
      >
        {publicView.signedIn ? "Play Infinite" : "Sign in to play"}
      </button>
    </div>
  );
  const tierSelect = viewedTier && tiers && (
    <TierSelect tiers={tiers.tiers} value={viewedTier} myTier={me?.tier} onChange={selectTier} />
  );
  const rewardLine = MONEY_ENABLED && topTier && topTier.rewardInr > 0 && (
    <span className={`text-xs md:text-[13.5px] ${DIAMOND_TEXT}`}>
      {topTier.name} (Tier 1) earns {formatInr(topTier.rewardInr)} every {topTier.daysToStick} days in a row.
    </span>
  );

  const dayCount = (e: { stickDays: number }) => (daysToStick ? `${e.stickDays} of ${daysToStick} days` : `${e.stickDays} days`);
  const toNormalized = (e: InfiniteLeaderboardEntry): NormalizedEntry => ({
    userId: e.userId,
    username: e.username,
    rank: e.rank,
    statLine: `${fmt(e.score)} pts · ${dayCount(e)}`,
    columns: [fmt(e.score), daysToStick ? `${e.stickDays} / ${daysToStick}` : `${e.stickDays}`, `${e.qualifyingDaysInTier} days`],
  });

  const entries = board?.leaderboard ?? [];
  const lastLoadedRank = entries.length > 0 ? entries[entries.length - 1].rank : 0;
  // Pin the caller's row only when they're in the viewed tier and ranked
  // below everything loaded so far. Their day count isn't in `me` on this
  // endpoint, so it comes from GET /infinite/me when that's the same tier.
  const pinned =
    board?.me?.inThisTier && board.me.rank !== null && board.me.rank > lastLoadedRank
      ? { ...board.me, rank: board.me.rank, stickDays: me && me.tier === board.tier ? me.counter.stickDays : null }
      : null;
  const sentinelIndex = Math.max(0, entries.length - 1 - LOAD_MORE_LOOKAHEAD);
  const podium = entries.length >= 3 ? entries.slice(0, 3).map(toNormalized) : [];
  const top = entries[0];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-6 md:gap-10 md:px-8 md:py-14">
      {/* header — mobile */}
      <div className="flex flex-col gap-5 md:hidden">
        <ScreenHeader title="Leaderboard" onBack={onBack} trailing={scopeSwitcher} />
        {tierSelect}
      </div>

      {/* header — desktop */}
      <div className="hidden flex-wrap items-end justify-between gap-8 md:flex">
        <div className="flex flex-col gap-3">
          <span className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${MUTED}`}>
            Infinite{tierName && ` · ${tierName}`}
            {board && ` · ${fmt(totalPlayers)} ${totalPlayers === 1 ? "player" : "players"}`}
          </span>
          <h1 className="text-[52px] font-light leading-[1.05] tracking-[-0.03em]">Leaderboard</h1>
        </div>
        <div className="flex items-center gap-2.5">
          {tierSelect}
          {scopeSwitcher}
        </div>
      </div>

      {error && !board ? (
        <p className="animate-fade-in text-sm text-danger">{error}</p>
      ) : !board ? (
        <Loader label="Loading leaderboard…" />
      ) : entries.length === 0 ? (
        <p className={`animate-fade-in text-sm ${MUTED}`}>No one has reached {tierName} yet.</p>
      ) : (
        <>
          {/* desktop: podium + table */}
          {podium.length === 3 && (
            <div className="hidden md:grid md:grid-cols-3 md:gap-5">
              <PodiumCard entry={podium[1]} rank={2} isMe={podium[1].userId === user?.id} delayMs={80} />
              <PodiumCard
                entry={{ ...podium[0], statLine: `${podium[0].statLine} · ${entries[0].qualifyingDaysInTier} qualified` }}
                rank={1}
                isMe={podium[0].userId === user?.id}
                firstLabel={`1st in ${tierName}`}
              />
              <PodiumCard entry={podium[2]} rank={3} isMe={podium[2].userId === user?.id} delayMs={160} />
            </div>
          )}

          <div className="hidden animate-fade-in-up overflow-hidden rounded-3xl border border-white/8 bg-white/[0.043] md:block">
            <div
              className={`grid grid-cols-[56px_minmax(0,1fr)_140px_140px_120px] gap-4 border-b border-white/8 px-7 py-4 text-xs font-semibold uppercase tracking-[0.14em] ${MUTED}`}
            >
              <span>#</span>
              <span>Player</span>
              <span>Points</span>
              <span>Day count</span>
              <span>Qualified</span>
            </div>
            {entries.map((entry, i) => {
              const row = toNormalized(entry);
              return (
                <TableRow
                  key={entry.userId}
                  rowRef={i === sentinelIndex ? sentinelRef : undefined}
                  rank={entry.rank}
                  username={entry.username}
                  columns={row.columns}
                  isMe={entry.userId === user?.id}
                />
              );
            })}
            {pinned && user && (
              <TableRow
                rank={pinned.rank}
                username={user.username}
                columns={[
                  fmt(pinned.score),
                  pinned.stickDays !== null && daysToStick ? `${pinned.stickDays} / ${daysToStick}` : "—",
                  `${pinned.qualifyingDaysInTier} days`,
                ]}
                isMe
              />
            )}
          </div>

          {/* mobile: hero card for #1 + list from #2 */}
          {top && (
            <div className="flex animate-fade-in-up items-center gap-3.5 rounded-[22px] border border-accent/35 bg-accent/10 p-5 md:hidden">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-[17px] font-bold text-background">
                {initial(top.username)}
              </span>
              <span className="flex min-w-0 flex-col gap-[3px]">
                <span className="truncate text-lg font-bold tracking-[-0.01em]">
                  {top.username}
                  {top.userId === user?.id && <span className="font-normal opacity-70"> · you</span>}
                </span>
                <span className="text-[12.5px] opacity-80">
                  1st · {fmt(top.score)} pts · {dayCount(top)}
                </span>
              </span>
              <span className="ml-auto text-xs font-semibold uppercase tracking-[0.14em] text-accent">Top</span>
            </div>
          )}

          <div className="-mt-4 flex flex-col md:hidden">
            {entries.slice(1).map((entry, i) => (
              <ListRow
                key={entry.userId}
                rowRef={i + 1 === sentinelIndex ? sentinelRef : undefined}
                rank={entry.rank}
                username={entry.username}
                sub={dayCount(entry)}
                score={entry.score}
                isMe={entry.userId === user?.id}
              />
            ))}
            {pinned && user && (
              <>
                <div className="flex justify-center py-2 text-[13px] tracking-[0.3em] text-[#6f6376]">···</div>
                <ListRow
                  rank={pinned.rank}
                  username={user.username}
                  sub={pinned.stickDays !== null ? dayCount({ stickDays: pinned.stickDays }) : ""}
                  score={pinned.score}
                  isMe
                />
              </>
            )}
          </div>

          {loadingMore && <p className={`animate-fade-in text-center text-xs ${MUTED}`}>Loading more…</p>}
        </>
      )}

      {board && cta}

      {rewardLine}

      {/* mobile footer */}
      {board && (
        <div className={`mt-auto flex justify-between pt-2 text-xs md:hidden ${MUTED}`}>
          <span>Resets daily {tiers?.resetTimeIst ?? "00:00"} IST</span>
          <span>
            {fmt(totalPlayers)} {totalPlayers === 1 ? "player" : "players"}
          </span>
        </div>
      )}
    </div>
  );
}

function TableRow({
  rank,
  username,
  columns,
  isMe,
  rowRef,
}: {
  rank: number;
  username: string;
  columns: [string, string, string];
  isMe: boolean;
  rowRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className={`grid grid-cols-[56px_minmax(0,1fr)_140px_140px_120px] items-center gap-4 border-b border-white/7 px-7 py-[18px] last:border-b-0 ${
        isMe ? "bg-accent/8" : ""
      }`}
    >
      <span className={`text-sm font-semibold ${isMe ? "text-accent" : MUTED}`}>{rank}</span>
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-semibold ${
            isMe ? "bg-accent/20 text-accent" : "bg-white/9"
          }`}
        >
          {initial(username)}
        </span>
        <span className={`truncate text-[15.5px] font-semibold ${isMe ? "text-accent" : ""}`}>
          {username}
          {isMe && " · you"}
        </span>
      </span>
      {columns.map((c, i) => (
        <span key={i} className={`text-[15px] ${isMe ? "text-foreground" : "text-[#c9bfcc]"}`}>
          {c}
        </span>
      ))}
    </div>
  );
}

function ListRow({
  rank,
  username,
  sub,
  score,
  isMe,
  rowRef,
}: {
  rank: number;
  username: string;
  sub: string;
  score: number;
  isMe: boolean;
  rowRef?: (node: HTMLElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-[13px] py-[15px] ${
        isMe ? "-mx-2.5 rounded-[14px] bg-accent/8 px-2.5" : "border-b border-white/7"
      }`}
    >
      <span className={`w-5 text-[13px] ${isMe ? "font-semibold text-accent" : MUTED}`}>{rank}</span>
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-semibold ${
          isMe ? "bg-accent/20 text-accent" : "bg-white/9"
        }`}
      >
        {initial(username)}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`truncate text-[15px] font-semibold ${isMe ? "text-accent" : ""}`}>
          {username}
          {isMe && " · you"}
        </span>
        {sub && <span className={`text-xs ${isMe ? "text-accent/80" : MUTED}`}>{sub}</span>}
      </span>
      <span className={`ml-auto text-[14.5px] ${isMe ? "text-foreground" : "text-[#c9bfcc]"}`}>{fmt(score)}</span>
    </div>
  );
}

/** Tier picker: full-width on mobile, compact on desktop. */
function TierSelect({
  tiers,
  value,
  myTier,
  onChange,
}: {
  tiers: TierDefinition[];
  value: TierNumber;
  myTier?: TierNumber;
  onChange: (tier: TierNumber) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = tiers.find((t) => t.tier === value);
  const sorted = [...tiers].sort((a, b) => a.tier - b.tier);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-[14px] border border-white/8 bg-white/[0.055] px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors duration-150 hover:border-accent/30 md:w-auto md:px-4 md:py-[11px]"
      >
        <TierBadge tier={value} />
        {current?.name ?? `Tier ${value}`}
        <span className="ml-auto text-[#c9bfcc] md:ml-1">
          <ChevronDownIcon open={open} />
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="absolute left-0 right-0 z-20 mt-2 animate-fade-in-up overflow-hidden rounded-xl border border-border bg-surface shadow-lg md:left-auto md:w-56"
          >
            {sorted.map((t) => (
              <button
                key={t.tier}
                type="button"
                role="option"
                aria-selected={t.tier === value}
                onClick={() => {
                  onChange(t.tier);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-background ${
                  t.tier === value ? "font-semibold" : ""
                }`}
              >
                <TierBadge tier={t.tier} />
                {t.name}
                {t.tier === myTier && <span className="ml-auto text-xs text-accent">You</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
