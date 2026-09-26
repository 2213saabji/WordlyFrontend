"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import TierBadge, { TierChip } from "@/components/TierBadge";
import { getInfiniteMe, getInfiniteTiers } from "@/lib/api";
import { readCache, writeCache } from "@/lib/cache";
import { MONEY_ENABLED } from "@/lib/flags";
import { formatInr, plural } from "@/lib/tiers";
import type { InfiniteMeResponse, InfiniteTiersResponse, TierWindowDay } from "@/types";

const ME_CACHE_KEY = "infinite:me";
const TIERS_CACHE_KEY = "infinite:tiers";

// Figma values for this screen's cards and day markers.
const QUALIFIED_BG = "bg-[#5f8f49]";
const MUTED = "text-[#9a8aa2]";
const SOFT = "text-[#c9bfcc]";
const CARD = "rounded-[22px] border border-white/8 bg-white/[0.045] md:rounded-3xl";

/** Infinite mode's home: the player's tier, their "days in a row" counter
 * toward promotion, today's targets and the last 7 settled days. Money
 * content (the Diamond reward line) only shows when MONEY_ENABLED is on. */
export default function InfiniteHubScreen({
  onBack,
  onPlay,
  onOpenTierLeaderboard,
  onOpenHowTiersWork,
  onOpenDiamond,
  onOpenTierHistory,
}: {
  onBack: () => void;
  onPlay: () => void;
  /** Omitted until the tier leaderboard screen exists — hides that button. */
  onOpenTierLeaderboard?: () => void;
  onOpenHowTiersWork?: () => void;
  /** Tier 1 only: the Diamond cycle / reward screen. */
  onOpenDiamond?: () => void;
  onOpenTierHistory?: () => void;
}) {
  // Seeded from the last visit (lib/cache.ts); the effect revalidates.
  const [me, setMe] = useState<InfiniteMeResponse | null>(() => readCache<InfiniteMeResponse>(ME_CACHE_KEY));
  const [tiers, setTiers] = useState<InfiniteTiersResponse | null>(() =>
    readCache<InfiniteTiersResponse>(TIERS_CACHE_KEY),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getInfiniteMe(), getInfiniteTiers()])
      .then(([me, tiers]) => {
        writeCache(ME_CACHE_KEY, me);
        writeCache(TIERS_CACHE_KEY, tiers);
        if (cancelled) return;
        setMe(me);
        setTiers(tiers);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buttons = (
    <>
      <button
        type="button"
        onClick={onPlay}
        className="rounded-2xl bg-accent px-6 py-4 text-[15.5px] font-bold text-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] md:order-2 md:rounded-[14px] md:px-[26px] md:py-[13px] md:text-[14.5px]"
      >
        Play next word
      </button>
      {onOpenTierLeaderboard && me && (
        <button
          type="button"
          onClick={onOpenTierLeaderboard}
          className="rounded-2xl border border-white/12 bg-white/7 px-6 py-[15px] text-[14.5px] font-semibold transition-colors duration-150 hover:border-accent/40 md:order-1 md:rounded-[14px] md:bg-transparent md:px-5 md:py-[13px] md:text-sm md:text-[#c9bfcc]"
        >
          {me.tierName} leaderboard
        </button>
      )}
    </>
  );

  // No data yet: loader, or — if the tier service is unreachable — still let
  // the player into a round rather than blocking Infinite on it.
  if (!me || !tiers) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-5 py-6 md:px-8 md:py-14">
        <div className="md:hidden">
          <ScreenHeader title="Infinite" onBack={onBack} />
        </div>
        {failed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <p className={`max-w-xs text-sm ${MUTED}`}>Your tier progress couldn&apos;t load right now.</p>
            <div className="flex w-full max-w-xs flex-col gap-2.5">{buttons}</div>
          </div>
        ) : (
          <Loader label="Loading your tier…" />
        )}
      </div>
    );
  }

  const nextTier = me.tier > 1 ? tiers.tiers.find((t) => t.tier === me.tier - 1) : undefined;
  const topTier = tiers.tiers.find((t) => t.tier === 1);
  const rankLine = me.rank !== null ? `#${me.rank} of ${me.tierSize}` : "Unranked";
  const resetLabel = `resets ${tiers.resetTimeIst} IST`;

  const counterText =
    me.tier === 1
      ? MONEY_ENABLED && topTier && topTier.rewardInr > 0
        ? `${plural(me.counter.daysLeft, "more qualifying day")} to earn ${formatInr(topTier.rewardInr)}. A missed day resets this to 0.`
        : `You're at the top. A missed day resets this to 0.`
      : `${plural(me.counter.daysLeft, "more qualifying day")} to move up to ${nextTier?.name ?? `Tier ${me.tier - 1}`}. A missed day resets this to 0.`;

  // Not in the Figma — the ways into the tier ladder/rules and history screens.
  const linkClass =
    "text-[12.5px] font-semibold text-accent underline-offset-4 hover:underline md:text-[13.5px]";
  const howItWorks = (onOpenHowTiersWork || onOpenTierHistory) && (
    <span className="flex flex-wrap gap-x-5 gap-y-1">
      {onOpenHowTiersWork && (
        <button type="button" onClick={onOpenHowTiersWork} className={linkClass}>
          How tiers work →
        </button>
      )}
      {onOpenTierHistory && (
        <button type="button" onClick={onOpenTierHistory} className={linkClass}>
          Tier history →
        </button>
      )}
    </span>
  );

  // In Diamond the "N tiers to Diamond" callout becomes the way into the
  // cycle / reward screen (not in the hub Figma).
  const diamondLink = me.tier === 1 && onOpenDiamond && (
    <button
      type="button"
      onClick={onOpenDiamond}
      className="flex w-full items-center gap-3 rounded-2xl border border-[#9fd4e6]/22 bg-[#9fd4e6]/8 px-[18px] py-3.5 text-left transition-colors hover:border-[#9fd4e6]/45 md:px-4"
    >
      <TierBadge tier={1} size="sm" />
      <span className="text-[13px] leading-[1.45] md:text-[13.5px]">
        <strong className="text-[#9fd4e6]">{MONEY_ENABLED ? "Diamond reward" : "Diamond cycle"}</strong> · day{" "}
        {me.counter.stickDays} of {me.counter.daysToStick}
      </span>
      <span className="ml-auto text-[#9fd4e6]">→</span>
    </button>
  );

  const callout = me.tier > 1 && topTier ? (
    <div className="flex items-center gap-3 rounded-2xl border border-[#9fd4e6]/22 bg-[#9fd4e6]/8 px-[18px] py-3.5 md:px-4">
      <TierBadge tier={1} size="sm" />
      <span className="text-[13px] leading-[1.45] md:text-[13.5px]">
        {plural(me.tier - 1, "tier")} to{" "}
        {MONEY_ENABLED && topTier.rewardInr > 0 ? (
          <>
            {topTier.name}. {topTier.name} players earn{" "}
            <strong className="text-[#9fd4e6]">
              {formatInr(topTier.rewardInr)} every {topTier.daysToStick} days
            </strong>
            .
          </>
        ) : (
          <>
            <strong className="text-[#9fd4e6]">{topTier.name}</strong>, the top of the Infinite board.
          </>
        )}
      </span>
    </div>
  ) : (
    diamondLink
  );

  const todayRows = (
    <>
      {me.today.targetMinutes > 0 && (
        <ProgressRow label="Active time" value={me.today.activeMinutes} target={me.today.targetMinutes} unit=" min" />
      )}
      <ProgressRow label="Games completed" value={me.today.gamesCompleted} target={me.today.targetGames} />
    </>
  );

  const missesLabel = (
    <span className={`text-[12.5px] md:text-[13.5px] ${me.demotion.atRisk ? "text-danger" : SOFT}`}>
      {me.demotion.missesInWindow} of {me.demotion.limit} misses
    </span>
  );

  // One more miss demotes and today doesn't count yet — the hub becomes a
  // "qualify today" warning until it does (Tier 8 has no demotion).
  if (me.demotion.atRisk && !me.today.qualified && me.tier < 8) {
    const lowerTier = tiers.tiers.find((t) => t.tier === me.tier + 1);
    return (
      <AtRiskView
        me={me}
        lowerTierName={lowerTier?.name ?? `Tier ${me.tier + 1}`}
        resetTimeIst={tiers.resetTimeIst}
        rewardInr={topTier?.rewardInr ?? 0}
        onBack={onBack}
        onPlay={onPlay}
        todayRows={todayRows}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-6 pt-6 md:gap-9 md:px-8 md:py-14">
      {/* ---------- mobile ---------- */}
      <div className="flex flex-1 flex-col md:hidden">
        <ScreenHeader title="Infinite" onBack={onBack} trailing={<TierChip tier={me.tier} name={me.tierName} />} />

        <div className={`mt-4 flex flex-col gap-[18px] p-[22px] ${CARD}`}>
          <div className="flex items-center gap-3.5">
            <TierBadge tier={me.tier} size="lg" />
            <span className="flex flex-col gap-[3px]">
              <span className="text-[19px] font-bold">{me.tierName}</span>
              <span className={`text-[12.5px] ${MUTED}`}>
                {rankLine} · {me.score} pts
              </span>
            </span>
            <span className={`ml-auto text-[11px] font-semibold uppercase tracking-[0.12em] ${MUTED}`}>
              Tier {me.tier}
            </span>
          </div>
          <div className="flex flex-col gap-[9px]">
            <CounterHeading stickDays={me.counter.stickDays} daysToStick={me.counter.daysToStick} />
            <StickBar stickDays={me.counter.stickDays} daysToStick={me.counter.daysToStick} />
            <span className={`text-[12.5px] ${MUTED}`}>{counterText}</span>
            {howItWorks}
          </div>
        </div>

        <div className={`mt-3.5 flex flex-col gap-4 px-[22px] py-5 ${CARD}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Today</span>
            <span className={`text-xs ${MUTED}`}>{resetLabel}</span>
          </div>
          {todayRows}
          <div className="flex items-center gap-2.5 border-t border-white/7 pt-3.5">
            <span className={`text-[12.5px] ${MUTED}`}>Last 7 days</span>
            <span className="ml-auto">
              <WindowDots window={me.demotion.window} />
            </span>
            {missesLabel}
          </div>
        </div>

        {callout && <div className="mt-3.5">{callout}</div>}

        <div className="mt-auto flex flex-col gap-2.5 pt-[22px]">{buttons}</div>
      </div>

      {/* ---------- desktop ---------- */}
      <div className="hidden items-end justify-between gap-8 md:flex">
        <div className="flex flex-col gap-3">
          <span className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${MUTED}`}>
            Infinite · Tier {me.tier} · {rankLine}
          </span>
          <h1 className="text-[52px] font-light leading-[1.05] tracking-[-0.03em]">{me.tierName}</h1>
        </div>
        <div className="flex gap-2.5">{buttons}</div>
      </div>

      <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-5 md:grid">
        <div className={`flex flex-col gap-5 p-[30px] ${CARD}`}>
          <CounterHeading stickDays={me.counter.stickDays} daysToStick={me.counter.daysToStick} large />
          <StickBar stickDays={me.counter.stickDays} daysToStick={me.counter.daysToStick} large />
          <span className={`text-sm ${MUTED}`}>{counterText}</span>
          {howItWorks}
          <div className="flex items-center gap-3 border-t border-white/7 pt-[18px]">
            <span className={`text-[13.5px] ${MUTED}`}>Last 7 days</span>
            <WindowDots window={me.demotion.window} large />
            <span className="ml-auto">{missesLabel}</span>
          </div>
        </div>

        <div className={`flex flex-col gap-5 p-[30px] ${CARD}`}>
          <div className="flex items-baseline justify-between">
            <span className="text-[17px] font-semibold">Today</span>
            <span className={`text-[13px] ${MUTED}`}>{resetLabel}</span>
          </div>
          {todayRows}
          {callout && <div className="mt-auto">{callout}</div>}
        </div>
      </div>
    </div>
  );
}

function CounterHeading({ stickDays, daysToStick, large = false }: { stickDays: number; daysToStick: number; large?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={`${large ? "text-sm" : "text-[13px]"} ${SOFT}`}>Days in a row</span>
      <span className={`font-display font-bold ${large ? "text-[44px]" : "text-[22px]"}`}>
        {stickDays}
        <span className={`${large ? "text-xl" : "text-sm"} ${MUTED}`}> / {daysToStick}</span>
      </span>
    </div>
  );
}

/** One segment per day of the tier's days-to-stick target, filled up to the
 * current counter. */
function StickBar({ stickDays, daysToStick, large = false }: { stickDays: number; daysToStick: number; large?: boolean }) {
  return (
    <div
      className={`grid ${large ? "gap-[5px]" : "gap-[3px]"}`}
      style={{ gridTemplateColumns: `repeat(${Math.max(daysToStick, 1)}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: daysToStick }, (_, i) => (
        <span
          key={i}
          className={`${large ? "h-3 rounded-[4px]" : "h-2 rounded-[3px]"} ${i < stickDays ? QUALIFIED_BG : "bg-white/10"}`}
        />
      ))}
    </div>
  );
}

function ProgressRow({ label, value, target, unit = "" }: { label: string; value: number; target: number; unit?: string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 100;
  return (
    <div className="flex flex-col gap-[7px] md:gap-[9px]">
      <div className="flex justify-between text-[13px] md:text-sm">
        <span className={SOFT}>{label}</span>
        <span className="font-semibold">
          {value} / {target}
          {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-[3px] bg-white/8 md:h-2 md:rounded-[4px]">
        <div className="h-full rounded-[inherit] bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** The last 7 settled days, oldest first; days not settled yet in this tier
 * (fewer than 7 since entering it) show as empty outlines. */
function WindowDots({ window, large = false }: { window: TierWindowDay[]; large?: boolean }) {
  const days = window.slice(-7);
  const empty = 7 - days.length;
  const size = large ? "size-[18px] rounded-md" : "size-3.5 rounded-[5px]";
  return (
    <span className={`flex ${large ? "gap-1.5" : "gap-[5px]"}`}>
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className={`${size} border border-white/10`} />
      ))}
      {days.map((d) => (
        <span
          key={d.day}
          title={`${d.day} · ${d.qualified ? "qualified" : "missed"}`}
          className={`${size} ${d.qualified ? QUALIFIED_BG : "bg-white/14"}`}
        />
      ))}
    </span>
  );
}

const MISSED_BG = "bg-[#b5543f]";
const ORDINALS = ["zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"];

function weekdayOf(day: string): string {
  // IST day keys are plain dates — format as UTC so the local zone can't shift them.
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/** "6 h 40 m left" until the next 00:00 IST reset, ticking every 30 s. */
function useTimeLeft(resetsAt: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const mins = Math.max(0, Math.floor((Date.parse(resetsAt) - now) / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h} h ${mins % 60} m left` : `${mins} m left`;
}

/** The hub's "at risk" state: the last 6 settled days plus today (dashed),
 * what's still needed before the reset, and — since any miss also resets
 * the day counter — what today's miss would cost beyond the demotion. In
 * Tier 1 that counter is the reward cycle (₹ only with MONEY_ENABLED). */
function AtRiskView({
  me,
  lowerTierName,
  resetTimeIst,
  rewardInr,
  onBack,
  onPlay,
  todayRows,
}: {
  me: InfiniteMeResponse;
  lowerTierName: string;
  resetTimeIst: string;
  /** Tier 1's reward (TierConfig) — 0 means unpaid. */
  rewardInr: number;
  onBack: () => void;
  onPlay: () => void;
  todayRows: React.ReactNode;
}) {
  const timeLeft = useTimeLeft(me.today.resetsAt);
  const past = me.demotion.window.slice(-6);
  const empty = 6 - past.length;
  const nth = ORDINALS[me.demotion.limit] ?? `${me.demotion.limit}th`;
  const consequence = `A ${nth} miss moves you down to ${lowerTierName} at ${resetTimeIst} IST.`;
  const { stickDays, daysToStick } = me.counter;
  const top = me.tier === 1;
  const paidCycle = top && MONEY_ENABLED && rewardInr > 0;

  const days = (large: boolean) => (
    <span className={`flex ${large ? "gap-2" : "gap-1.5"}`}>
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e${i}`} className={`flex-1 border border-white/10 ${large ? "h-10 rounded-[10px]" : "h-[26px] rounded-[7px]"}`} />
      ))}
      {past.map((d) => (
        <span
          key={d.day}
          title={`${d.day} · ${d.qualified ? "qualified" : "missed"}`}
          className={`flex-1 ${d.qualified ? QUALIFIED_BG : MISSED_BG} ${large ? "h-10 rounded-[10px]" : "h-[26px] rounded-[7px]"}`}
        />
      ))}
      <span
        title="Today"
        className={`flex-1 border-2 border-dashed border-accent ${large ? "h-10 rounded-[10px]" : "h-[26px] rounded-[7px]"}`}
      />
    </span>
  );

  // What a miss today resets besides the tier (not in the Figma for tiers 2–7).
  const cycleTitle = top
    ? `${paidCycle ? "Reward" : me.tierName} cycle: day ${stickDays} of ${daysToStick}`
    : `${me.tierName} day count: ${stickDays} of ${daysToStick}`;
  const cycleBody = top
    ? `Missing today also resets your ${paidCycle ? `${formatInr(rewardInr)} ` : ""}cycle to day 0, even if you stay in ${me.tierName}.`
    : `Missing today also resets your day count to 0, even if you stay in ${me.tierName}.`;
  const cycleLine = top
    ? `Missing today also resets your ${paidCycle ? formatInr(rewardInr) : me.tierName} cycle (day ${stickDays} of ${daysToStick}) to day 0, even if you stay in ${me.tierName}.`
    : `Missing today also resets your day count (${stickDays} of ${daysToStick}) to 0, even if you stay in ${me.tierName}.`;
  const showCycle = stickDays > 0;

  const neededHeader = (large: boolean) => (
    <div className="flex items-baseline justify-between">
      <span className={`font-semibold ${large ? "text-[17px]" : "text-sm"}`}>Still needed today</span>
      <span className={`text-accent ${large ? "text-[13px]" : "text-xs"}`}>{timeLeft}</span>
    </div>
  );

  const playButton = (
    <button
      type="button"
      onClick={onPlay}
      className="rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] md:whitespace-nowrap md:rounded-[14px] md:px-[26px] md:py-[13px] md:text-[14.5px]"
    >
      Play now
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-6 pt-6 md:gap-8 md:px-8 md:py-14">
      {/* ---------- mobile ---------- */}
      <div className="flex flex-1 flex-col md:hidden">
        <ScreenHeader title="Infinite" onBack={onBack} trailing={<TierChip tier={me.tier} name={me.tierName} />} />

        <div className="mt-4 flex flex-col gap-4 rounded-[22px] border border-accent/45 bg-accent/10 p-[22px]">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">At risk</span>
          <span className="font-display text-[26px] font-bold leading-[1.15]">Qualify today to stay in {me.tierName}</span>
          <div className="flex flex-col gap-2">
            {days(false)}
            <span className={`flex justify-between text-[11.5px] ${MUTED}`}>
              <span>{past[0] ? weekdayOf(past[0].day) : ""}</span>
              <span>Today</span>
            </span>
          </div>
          <span className="text-[13.5px] leading-[1.55]">
            You&apos;ve missed {me.demotion.missesInWindow} of the last 7 days. {consequence}
          </span>
        </div>

        <div className={`mt-3.5 flex flex-col gap-3.5 px-[22px] py-5 ${CARD}`}>
          {neededHeader(false)}
          {todayRows}
        </div>

        {showCycle && (
          <div className="mt-3.5 flex flex-col gap-1 rounded-2xl border border-[#9fd4e6]/22 bg-[#9fd4e6]/8 px-[18px] py-3.5">
            <span className="text-[13.5px] font-semibold text-[#9fd4e6]">{cycleTitle}</span>
            <span className={`text-[12.5px] leading-normal ${SOFT}`}>{cycleBody}</span>
          </div>
        )}

        <div className="mt-auto flex flex-col pt-[22px]">{playButton}</div>
      </div>

      {/* ---------- desktop ---------- */}
      <div className="hidden items-end justify-between gap-8 md:flex">
        <div className="flex flex-col gap-3">
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-accent">
            At risk · {me.demotion.missesInWindow} of {me.demotion.limit} misses
          </span>
          <h1 className="text-[52px] font-light leading-[1.05] tracking-[-0.03em]">
            Qualify today to stay in {me.tierName}
          </h1>
        </div>
        {playButton}
      </div>

      <div className="hidden grid-cols-2 gap-5 md:grid">
        <div className="flex flex-col gap-[18px] rounded-3xl border border-accent/40 bg-accent/8 p-[30px]">
          <span className="text-[17px] font-semibold">Last 7 days</span>
          {days(true)}
          <span className="text-[14.5px] leading-[1.55]">{consequence}</span>
          {showCycle && <span className="text-sm leading-[1.55] text-[#9fd4e6]">{cycleLine}</span>}
        </div>
        <div className={`flex flex-col gap-5 p-[30px] ${CARD}`}>
          {neededHeader(true)}
          {todayRows}
        </div>
      </div>
    </div>
  );
}
