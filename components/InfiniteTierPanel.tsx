"use client";

import { useCallback, useState } from "react";
import { getInfiniteMe, getInfiniteTiers } from "@/lib/api";
import { useSyncedResource } from "@/lib/use-synced";
import { CoinIcon } from "@/components/CoinChip";
import { formatCoins, hintCostOf, plural } from "@/lib/tiers";
import type {
  CoinsAwarded,
  Game,
  InfiniteGuessTierBlock,
  InfiniteMeResponse,
  InfiniteTiersResponse,
  TodayProgress,
} from "@/types";

// Shared with the hub / tier leaderboard / How tiers work.
const ME_CACHE_KEY = "infinite:me";
const TIERS_CACHE_KEY = "infinite:tiers";

const SOFT = "text-[#c9bfcc]";
const MUTED = "text-[#9a8aa2]";

/** Tier state for an Infinite round: the player's tier status, the ladder
 * and today's progress. Both come from the synced cache (lib/use-synced.ts):
 * only refetched when missing or when /sync reports them changed — which
 * also covers returning to the tab, the IST-midnight reset and play on
 * another device. Active time is measured server-side from round starts and
 * guesses, so `today` is only ever the server's value — from the
 * round-ending guess / new-round responses (setToday) or GET /infinite/me.
 * Never tick it locally: the server caps each gap at 2 min, so a local
 * clock would drift. Inert when `enabled` is false. */
export function useInfiniteTier(enabled: boolean) {
  const meRes = useSyncedResource({ flag: "infinite", key: ME_CACHE_KEY, fetcher: getInfiniteMe, enabled });
  const tiersRes = useSyncedResource({ flag: "tiers", key: TIERS_CACHE_KEY, fetcher: getInfiniteTiers, enabled });
  const me: InfiniteMeResponse | null = meRes.data;
  const tiers: InfiniteTiersResponse | null = tiersRes.data;

  // An action's own `today` (guess / new round) wins until /infinite/me is
  // refetched, which then carries the newer value.
  const [override, setOverride] = useState<{ forMe: InfiniteMeResponse | null; value: TodayProgress } | null>(null);
  const today = override && override.forMe === me ? override.value : (me?.today ?? null);
  const setToday = useCallback((value: TodayProgress) => setOverride({ forMe: me, value }), [me]);

  const { refetch } = meRes;
  const refreshMe = useCallback(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);

  // The tier boundaries where hints switch off (hintCost null) and where
  // they start costing coins ("Copper and up").
  const lowest = (pick: (cost: number | null) => boolean) =>
    tiers ? [...tiers.tiers].filter((t) => pick(hintCostOf(t))).sort((a, b) => b.tier - a.tier)[0] : undefined;
  const hintsOffFrom = lowest((cost) => cost === null);
  const paidHintsFrom = lowest((cost) => cost !== null && cost > 0);

  return { me, tiers, today, setToday, refreshMe, hintsOffFrom, paidHintsFrom };
}

function Bar({ value, target, thin = false }: { value: number; target: number; thin?: boolean }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 100;
  return (
    <span className={`block rounded-full bg-white/8 ${thin ? "h-1" : "h-1.5"}`}>
      <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </span>
  );
}

/** Mobile: the compact "Time 18 / 25 min · Games 6 / 9" strip. */
export function TodayStrip({ today }: { today: TodayProgress }) {
  return (
    <div className={`flex gap-2.5 rounded-[14px] bg-white/[0.045] px-3.5 py-2.5 text-xs ${SOFT}`}>
      {today.targetMinutes > 0 && (
        <span className="flex flex-1 flex-col gap-[5px]">
          <span>
            Time {today.activeMinutes} / {today.targetMinutes} min
          </span>
          <Bar value={today.activeMinutes} target={today.targetMinutes} thin />
        </span>
      )}
      <span className="flex flex-1 flex-col gap-[5px]">
        <span>
          Games {today.gamesCompleted} / {today.targetGames}
        </span>
        <Bar value={today.gamesCompleted} target={today.targetGames} thin />
      </span>
    </div>
  );
}

/** Desktop sidebar: the "Today" card with the tier day count. */
export function TodayCard({
  today,
  stickDays,
  daysToStick,
}: {
  today: TodayProgress;
  stickDays?: number;
  daysToStick?: number;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[22px] border border-white/8 bg-white/[0.043] p-[22px]">
      <span className="text-[15px] font-semibold">Today</span>
      {today.targetMinutes > 0 && (
        <div className="flex flex-col gap-[7px]">
          <div className="flex justify-between text-[13px]">
            <span className={SOFT}>Active time</span>
            <span>
              {today.activeMinutes} / {today.targetMinutes} min
            </span>
          </div>
          <Bar value={today.activeMinutes} target={today.targetMinutes} />
        </div>
      )}
      <div className="flex flex-col gap-[7px]">
        <div className="flex justify-between text-[13px]">
          <span className={SOFT}>Games</span>
          <span>
            {today.gamesCompleted} / {today.targetGames}
          </span>
        </div>
        <Bar value={today.gamesCompleted} target={today.targetGames} />
      </div>
      {stickDays !== undefined && daysToStick !== undefined && (
        <span className={`text-[12.5px] ${MUTED}`}>
          Day count {stickDays} of {daysToStick}
        </span>
      )}
    </div>
  );
}

/** Replaces the hint control in Tiers 1–6. */
export function HintsOffNotice({ fromName, fromTier }: { fromName?: string; fromTier?: number }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-[14px] border border-dashed border-white/14 bg-white/4 px-3.5 py-[11px] text-[12.5px] leading-normal md:gap-3 md:rounded-[18px] md:border-white/16 md:bg-white/3 md:p-[18px] md:text-[13.5px] ${MUTED}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className="mt-px size-4 flex-none md:size-[18px]"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>
        {fromName && fromTier ? `Hints are off from ${fromName} (Tier ${fromTier}) up.` : "Hints are off in your tier."}
      </span>
    </div>
  );
}

/** What the round that just ended did for the player's tier — built from
 * the `tier` block on the guess that finished it. */
export interface TierRoundResult {
  block: InfiniteGuessTierBlock;
  /** Rank before this round, for the ↑/↓ delta; null if unranked. */
  prevRank: number | null;
  /** The guess response's `coins` block (+10 for a solve). */
  coins?: CoinsAwarded;
}

/** End-of-round tier summary: points earned (+ day bonus), whether today now
 * qualifies, rank / score / games, and the distance to Diamond. Mobile
 * renders it as a bottom sheet, desktop as a sidebar card. */
export function TierResultCard({
  game,
  result,
  me,
  tiers,
  onNext,
  onBoard,
  variant,
}: {
  game: Game;
  result: TierRoundResult;
  me: InfiniteMeResponse | null;
  tiers: InfiniteTiersResponse | null;
  onNext: () => void;
  onBoard?: () => void;
  variant: "sheet" | "card";
}) {
  const { block, prevRank, coins } = result;
  const { today } = block;
  const won = game.status === "won";
  const total = block.pointsAwarded + block.qualifyingBonusAwarded;
  const rankDelta = prevRank !== null ? prevRank - block.rank : 0;
  const top = tiers?.tiers.find((t) => t.tier === 1);
  const tier = me?.tier;
  const card = variant === "card";

  const breakdown = [`${block.pointsAwarded} game`];
  if (block.qualifyingBonusAwarded > 0) breakdown.push(`${block.qualifyingBonusAwarded} day bonus`);

  // Still short of today's targets: say exactly what's left.
  const minutesLeft = Math.max(0, today.targetMinutes - today.activeMinutes);
  const gamesLeft = Math.max(0, today.targetGames - today.gamesCompleted);
  const remaining = [
    gamesLeft > 0 ? `${plural(gamesLeft, "more game")}` : null,
    minutesLeft > 0 ? `${minutesLeft} more min` : null,
  ].filter(Boolean);

  return (
    <div
      className={`flex flex-col ${
        card
          ? "gap-[22px] rounded-[26px] border border-white/10 bg-[#1f1725] p-[30px]"
          : "gap-5 rounded-t-[30px] border-t border-white/10 bg-[#1f1725] px-[22px] pb-[26px] pt-3.5"
      }`}
    >
      {!card && <span className="h-1 w-11 self-center rounded-[3px] bg-white/18" />}

      <div className="flex items-end justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1">
          <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${MUTED}`}>
            {won ? `Solved in ${game.guesses.length}` : "Out of guesses"}
          </span>
          {game.word && (
            <span className={`font-display font-bold uppercase tracking-[0.06em] ${card ? "text-[40px]" : "text-[34px]"}`}>
              {game.word}
            </span>
          )}
        </span>
        <span className="flex flex-none flex-col items-end gap-1">
          <span className={`font-display font-bold text-accent ${card ? "text-[30px]" : "text-[26px]"}`}>+{total}</span>
          <span className={`text-xs ${MUTED}`}>{breakdown.join(" · ")}</span>
        </span>
      </div>

      {today.qualified ? (
        <div className="flex items-center gap-3 rounded-2xl border border-[#5f8f49]/45 bg-[#5f8f49]/14 px-4 py-3.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="#8FC274" strokeWidth={2.4} strokeLinecap="round" className="size-[18px] flex-none">
            <path d="m5 12 5 5 9-10" />
          </svg>
          <span className={`leading-[1.45] ${card ? "text-sm" : "text-[13.5px]"}`}>
            Today counts.
            {me && (
              <>
                {" "}
                That&apos;s{" "}
                <strong>
                  day {me.counter.stickDays + 1} of {me.counter.daysToStick}
                </strong>{" "}
                in {me.tierName} once tonight&apos;s reset runs.
              </>
            )}
          </span>
        </div>
      ) : (
        remaining.length > 0 && (
          <div className={`rounded-2xl border border-white/8 bg-white/4 px-4 py-3.5 leading-[1.45] ${card ? "text-sm" : "text-[13.5px]"} ${SOFT}`}>
            {remaining.join(" and ")} to make today count.
          </div>
        )
      )}

      {/* Hidden for a loss, or a round already credited (awarded 0). */}
      {coins && coins.awarded > 0 && (
        <div
          className={`flex items-center gap-3 rounded-2xl border border-[#e3b75a]/35 bg-[#e3b75a]/10 px-4 ${card ? "py-[13px]" : "py-3"}`}
        >
          <CoinIcon className="size-5" />
          <span className={card ? "text-sm" : "text-[13.5px]"}>
            <strong className="text-[#e3b75a]">+{formatCoins(coins.awarded)}</strong> for the solve
          </span>
          <span className={`ml-auto whitespace-nowrap ${card ? "text-[13px]" : "text-[12.5px]"} ${MUTED}`}>
            {coins.balance.toLocaleString("en-IN")} total
          </span>
        </div>
      )}

      <div className={`grid grid-cols-3 ${card ? "gap-2.5" : "gap-2"}`}>
        <Stat label="Rank" card={card}>
          #{block.rank}
          {rankDelta !== 0 && (
            <span className={`text-xs ${rankDelta > 0 ? "text-[#8fc274]" : "text-danger"}`}>
              {" "}
              {rankDelta > 0 ? "↑" : "↓"}
              {Math.abs(rankDelta)}
            </span>
          )}
        </Stat>
        <Stat label="Points" card={card}>
          {block.score.toLocaleString("en-IN")}
        </Stat>
        <Stat label="Games" card={card}>
          {today.gamesCompleted} / {today.targetGames}
        </Stat>
      </div>

      {tier !== undefined && tier > 1 && top && (
        <span className={`${card ? "text-[13px]" : "text-[12.5px]"} ${MUTED}`}>
          {plural(tier - 1, "tier")} to {top.name}.
        </span>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onNext}
          className={`flex-1 bg-accent font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] ${
            card ? "rounded-[15px] p-[15px] text-[15px]" : "rounded-2xl p-4 text-[15.5px]"
          }`}
        >
          Next word
        </button>
        {onBoard && (
          <button
            type="button"
            onClick={onBoard}
            className={`border border-white/12 bg-white/7 text-[14.5px] font-semibold transition-colors hover:border-accent/40 ${
              card ? "rounded-[15px] px-[22px] py-[15px]" : "rounded-2xl px-5 py-4"
            }`}
          >
            {card ? "Leaderboard" : "Board"}
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, card, children }: { label: string; card: boolean; children: React.ReactNode }) {
  return (
    <span className={`flex flex-col rounded-[14px] bg-white/4 ${card ? "gap-1 p-3.5" : "gap-[3px] p-3"}`}>
      <span className={`${card ? "text-[11.5px]" : "text-[11px]"} ${MUTED}`}>{label}</span>
      <span className={`font-bold ${card ? "text-[19px]" : "text-[17px]"}`}>{children}</span>
    </span>
  );
}
