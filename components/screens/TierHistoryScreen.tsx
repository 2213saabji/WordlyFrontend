"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import { getInfiniteMe, getInfiniteTierChanges, getInfiniteTiers, getRewards } from "@/lib/api";
import { readCache, writeCache } from "@/lib/cache";
import { MONEY_ENABLED } from "@/lib/flags";
import { TIER_COLORS, formatInr, plural } from "@/lib/tiers";
import type {
  InfiniteMeResponse,
  InfiniteTiersResponse,
  Payout,
  RewardStatus,
  TierChange,
  TierChangesResponse,
  TierNumber,
} from "@/types";

// Shared with the other tier screens.
const ME_CACHE_KEY = "infinite:me";
const TIERS_CACHE_KEY = "infinite:tiers";
const REWARDS_CACHE_KEY = "infinite:rewards";
const HISTORY_CACHE_KEY = "infinite:tier-history";
const PAGE_SIZE = 20;

const MUTED = "text-[#9a8aa2]";
const FAINT = "text-[#6f6376]";
const SOFT = "text-[#c9bfcc]";
const UP = "#8fc274";
const DOWN = "#e07a62";
const DIAMOND = "#9fd4e6";

type Entry =
  | { kind: "change"; day: string; change: TierChange }
  | { kind: "cycle"; day: string; payout: Payout };

function shortDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
function monthName(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
}

/** Every tier move (GET /infinite/tier-changes, newest first) merged with
 * completed Diamond cycles (from the payout log) into one timeline. */
export default function TierHistoryScreen({ onBack }: { onBack: () => void }) {
  const [me, setMe] = useState<InfiniteMeResponse | null>(() => readCache<InfiniteMeResponse>(ME_CACHE_KEY));
  const [tiers, setTiers] = useState<InfiniteTiersResponse | null>(() =>
    readCache<InfiniteTiersResponse>(TIERS_CACHE_KEY),
  );
  const [history, setHistory] = useState<TierChangesResponse | null>(() =>
    readCache<TierChangesResponse>(HISTORY_CACHE_KEY),
  );
  const [rewards, setRewards] = useState<RewardStatus | null>(() => readCache<RewardStatus>(REWARDS_CACHE_KEY));
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getInfiniteTierChanges({ page: 1, limit: PAGE_SIZE })
      .then((res) => {
        writeCache(HISTORY_CACHE_KEY, res);
        setHistory(res);
      })
      .catch(() => setFailed(true));
    getInfiniteMe()
      .then((res) => {
        writeCache(ME_CACHE_KEY, res);
        setMe(res);
      })
      .catch(() => {});
    getInfiniteTiers()
      .then((res) => {
        writeCache(TIERS_CACHE_KEY, res);
        setTiers(res);
      })
      .catch(() => {});
    // Completed cycles aren't in the tier-change log — they come from the
    // payout log (same source as the Diamond screen). Optional.
    getRewards()
      .then((res) => {
        writeCache(REWARDS_CACHE_KEY, res);
        setRewards(res);
      })
      .catch(() => {});
  }, []);

  const canLoadMore = !!history && history.pagination.page < history.pagination.totalPages;

  function loadMore() {
    if (!history || loadingMore || !canLoadMore) return;
    setLoadingMore(true);
    getInfiniteTierChanges({ page: history.pagination.page + 1, limit: PAGE_SIZE })
      .then((next) =>
        setHistory((prev) =>
          prev ? { changes: [...prev.changes, ...next.changes], pagination: next.pagination } : next,
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }

  if (!history) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-5 py-6 md:px-8 md:py-14">
        <ScreenHeader title="Tier history" onBack={onBack} />
        {failed ? (
          <p className={`text-sm ${MUTED}`}>Your tier history couldn&apos;t load right now.</p>
        ) : (
          <Loader label="Loading history…" />
        )}
      </div>
    );
  }

  const name = (t: TierNumber) => tiers?.tiers.find((x) => x.tier === t)?.name ?? `Tier ${t}`;
  const topName = name(1);
  const reward = tiers?.tiers.find((t) => t.tier === 1)?.rewardInr ?? 0;
  const paid = MONEY_ENABLED && reward > 0;

  // Only cycles within the loaded range of moves, so paging stays in order.
  const oldestLoaded = history.changes.at(-1)?.day;
  const cycles = (rewards?.payouts ?? []).filter((p) => canLoadMore === false || !oldestLoaded || p.eligibleDay >= oldestLoaded);
  const entries: Entry[] = [
    ...history.changes.map((c) => ({ kind: "change" as const, day: c.day, change: c })),
    ...cycles.map((p) => ({ kind: "cycle" as const, day: p.eligibleDay, payout: p })),
  ].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));

  // Summary: current tier, best tier ever reached, move count + since when.
  const reached = history.changes.map((c) => c.toTier).concat(me ? [me.tier] : []);
  const highest = reached.length > 0 ? (Math.min(...reached) as TierNumber) : undefined;
  const moves = history.changes.filter((c) => c.reason === "promotion" || c.reason === "demotion").length;
  const sinceLabel = !canLoadMore && oldestLoaded ? ` since ${monthName(oldestLoaded)}` : "";
  const summarySub = [
    highest ? `Highest: ${name(highest)}` : null,
    `${plural(canLoadMore ? history.pagination.total : moves, "move")}${sinceLabel}`,
  ]
    .filter(Boolean)
    .join(" · ");

  function describe(e: Entry) {
    if (e.kind === "cycle") {
      return {
        from: 1 as TierNumber,
        to: 1 as TierNumber,
        arrow: "★",
        arrowColor: DIAMOND,
        title: `${topName} cycle complete`,
        detail: `${paid ? `${formatInr(e.payout.amountInr || reward)} earned` : `${topName} star`} · cycle ${e.payout.cycle}`,
        position: "—",
      };
    }
    const c = e.change;
    const position = c.oldRank !== null && c.rankAtEntry !== null ? `#${c.oldRank} → #${c.rankAtEntry}` : "—";
    const fromDef = tiers?.tiers.find((t) => t.tier === c.fromTier);
    switch (c.reason) {
      case "promotion":
        return {
          from: c.fromTier,
          to: c.toTier,
          arrow: "↑",
          arrowColor: UP,
          title: `Moved up to ${name(c.toTier)}`,
          detail: fromDef ? `${fromDef.daysToStick} days in a row` : "",
          position,
        };
      case "demotion":
        return {
          from: c.fromTier,
          to: c.toTier,
          arrow: "↓",
          arrowColor: DOWN,
          title: `Moved down to ${name(c.toTier)}`,
          detail: tiers ? `${tiers.demotion.misses} misses in ${tiers.demotion.windowDays}` : "",
          position,
        };
      default:
        // "seed" (first placement) / "admin" (set by support).
        return {
          from: c.fromTier,
          to: c.toTier,
          arrow: c.toTier < c.fromTier ? "↑" : c.toTier > c.fromTier ? "↓" : "·",
          arrowColor: c.toTier < c.fromTier ? UP : c.toTier > c.fromTier ? DOWN : DIAMOND,
          title: c.reason === "seed" ? `Placed in ${name(c.toTier)}` : `Moved to ${name(c.toTier)}`,
          detail: c.reason === "admin" ? "Adjusted by support" : "",
          position,
        };
    }
  }

  const move = (from: TierNumber, to: TierNumber, arrow: string, color: string, large: boolean) => (
    <span className={`flex flex-none items-center ${large ? "gap-1.5" : "gap-1"}`}>
      <MiniBadge tier={from} faded large={large} />
      <span className={large ? "text-[13px]" : "text-xs"} style={{ color }}>
        {arrow}
      </span>
      <MiniBadge tier={to} large={large} />
    </span>
  );

  const loadMoreButton = canLoadMore && (
    <button
      type="button"
      onClick={loadMore}
      disabled={loadingMore}
      className={`mt-4 self-center rounded-xl border border-white/12 px-4 py-2 text-[13px] font-semibold ${SOFT} transition-colors hover:border-accent/40 hover:text-foreground`}
    >
      {loadingMore ? "Loading…" : "Load more"}
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 pb-6 pt-6 md:gap-8 md:px-8 md:py-14">
      {/* ---------- mobile ---------- */}
      <div className="flex flex-col md:hidden">
        <ScreenHeader title="Tier history" onBack={onBack} />

        {me && (
          <div className="mt-4 flex items-center gap-3.5 rounded-[20px] border border-white/8 bg-white/[0.045] px-5 py-[18px]">
            <span
              style={{ backgroundColor: TIER_COLORS[me.tier] }}
              className="flex size-11 flex-none items-center justify-center rounded-[14px] font-display text-[19px] font-bold text-background"
            >
              {me.tier}
            </span>
            <span className="flex flex-col gap-[3px]">
              <span className="text-[17px] font-bold">{me.tierName} now</span>
              <span className={`text-[12.5px] ${MUTED}`}>{summarySub}</span>
            </span>
          </div>
        )}

        {entries.length === 0 ? (
          <p className={`py-8 text-center text-sm ${SOFT}`}>No tier moves yet. Keep qualifying to move up.</p>
        ) : (
          <div className="mt-[18px] flex flex-col">
            {entries.map((e) => {
              const d = describe(e);
              return (
                <div key={`${e.kind}-${e.day}-${d.title}`} className="flex gap-3.5 border-b border-white/7 py-3.5">
                  {move(d.from, d.to, d.arrow, d.arrowColor, false)}
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="text-sm font-semibold">{d.title}</span>
                    <span className={`text-[12.5px] ${MUTED}`}>
                      {[d.position !== "—" ? d.position : null, d.detail || null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className={`ml-auto flex-none text-xs ${FAINT}`}>{shortDate(e.day)}</span>
                </div>
              );
            })}
          </div>
        )}
        {loadMoreButton}
      </div>

      {/* ---------- desktop ---------- */}
      <div className="hidden flex-col gap-3 md:flex">
        <span className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${MUTED}`}>
          Infinite{me ? ` · ${me.tierName} now` : ""}
          {highest ? ` · highest ${name(highest)}` : ""}
        </span>
        <h1 className="text-[52px] font-light leading-[1.05] tracking-[-0.03em]">Tier history</h1>
      </div>

      <div className="hidden flex-col md:flex">
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[0.043]">
          <div
            className={`grid grid-cols-[140px_150px_minmax(0,1fr)_200px] gap-4 border-b border-white/8 px-7 py-4 text-xs font-semibold uppercase tracking-[0.14em] ${MUTED}`}
          >
            <span>Date</span>
            <span>Move</span>
            <span>Event</span>
            <span>Position</span>
          </div>
          {entries.length === 0 ? (
            <p className={`px-7 py-8 text-sm ${SOFT}`}>No tier moves yet. Keep qualifying to move up.</p>
          ) : (
            entries.map((e) => {
              const d = describe(e);
              return (
                <div
                  key={`${e.kind}-${e.day}-${d.title}`}
                  className="grid grid-cols-[140px_150px_minmax(0,1fr)_200px] items-center gap-4 border-b border-white/7 px-7 py-4 last:border-b-0"
                >
                  <span className={`text-sm ${MUTED}`}>{shortDate(e.day)}</span>
                  {move(d.from, d.to, d.arrow, d.arrowColor, true)}
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{d.title}</span>
                    {d.detail && <span className={`text-[13px] ${MUTED}`}>{d.detail}</span>}
                  </span>
                  <span className={`text-[14.5px] ${SOFT}`}>{d.position}</span>
                </div>
              );
            })
          )}
        </div>
        {loadMoreButton}
      </div>
    </div>
  );
}

/** The 24/26px badge size the history rows use (TierBadge has no such size). */
function MiniBadge({ tier, faded = false, large }: { tier: TierNumber; faded?: boolean; large: boolean }) {
  return (
    <span className={faded ? "opacity-50" : ""}>
      <span
        style={{ backgroundColor: TIER_COLORS[tier] }}
        className={`flex items-center justify-center font-display font-bold text-background ${
          large ? "size-[26px] rounded-lg text-xs" : "size-6 rounded-[7px] text-[11px]"
        }`}
      >
        {tier}
      </span>
    </span>
  );
}
