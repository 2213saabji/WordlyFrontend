"use client";

import { useEffect, useState } from "react";
import { getInfiniteMe, getInfiniteTierChanges, getInfiniteTiers } from "@/lib/api";
import { readCache, writeCache } from "@/lib/cache";
import { MONEY_ENABLED } from "@/lib/flags";
import { SITE_URL } from "@/lib/seo";
import { TIER_COLORS, formatInr, plural } from "@/lib/tiers";
import type { InfiniteMeResponse, InfiniteTiersResponse, TierChange, TierNumber } from "@/types";

// Shared with the hub / tier leaderboard / play screen.
const ME_CACHE_KEY = "infinite:me";
const TIERS_CACHE_KEY = "infinite:tiers";
// "<reason>:<day>:<toTier>" of the last tier change already announced on
// this device.
const SEEN_KEY = "infinite:seen-tier-change";
// Only announce recent moves — "moved up/down overnight" is stale after that.
const MAX_AGE_DAYS = 2;

const MUTED = "text-[#9a8aa2]";
const SOFT = "text-[#c9bfcc]";

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

interface Announcement {
  me: InfiniteMeResponse;
  tiers: InfiniteTiersResponse;
  /** Full log entry for the score carry-in row; null if it couldn't load. */
  change: TierChange | null;
}

/** Checks once per app load whether the player moved tier (promotion or
 * demotion) since they last looked, and if so shows the matching screen
 * (full-screen on mobile, a dialog on desktop) exactly once. Mount only with
 * INFINITE_TIERS_ENABLED. */
export default function TierPromotionAnnouncer({
  onOpenTierLeaderboard,
  onPlay,
}: {
  onOpenTierLeaderboard: (tier: TierNumber) => void;
  /** The demotion screen's "Play now". */
  onPlay: () => void;
}) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getInfiniteMe();
        writeCache(ME_CACHE_KEY, me);
        const last = me.lastChange;
        if (!last || (last.reason !== "promotion" && last.reason !== "demotion")) return;
        const key = `${last.reason}:${last.day}:${last.toTier}`;
        if (readCache<string>(SEEN_KEY) === key) return;
        if (daysBetween(last.day, me.today.day) > MAX_AGE_DAYS) return;

        const [tiers, changes] = await Promise.all([
          getInfiniteTiers(),
          getInfiniteTierChanges({ page: 1, limit: 1 }).catch(() => null),
        ]);
        writeCache(TIERS_CACHE_KEY, tiers);
        const change = changes?.changes[0];
        if (cancelled) return;
        writeCache(SEEN_KEY, key);
        setAnnouncement({
          me,
          tiers,
          change: change && change.toTier === last.toTier && change.reason === last.reason ? change : null,
        });
      } catch {
        // No announcement is the right failure mode.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!announcement) return null;
  return (
    <PromotionScreen
      {...announcement}
      onClose={() => setAnnouncement(null)}
      onSeeLeaderboard={(tier) => {
        setAnnouncement(null);
        onOpenTierLeaderboard(tier);
      }}
      onPlay={() => {
        setAnnouncement(null);
        onPlay();
      }}
    />
  );
}

function PromotionScreen({
  me,
  tiers,
  change,
  onClose,
  onSeeLeaderboard,
  onPlay,
}: Announcement & { onClose: () => void; onSeeLeaderboard: (tier: TierNumber) => void; onPlay: () => void }) {
  const [copied, setCopied] = useState(false);
  const last = me.lastChange!;
  const demoted = last.reason === "demotion";
  const missedWindow = demoted ? (change?.window?.slice(-7) ?? null) : null;
  const from = tiers.tiers.find((t) => t.tier === last.fromTier);
  const to = tiers.tiers.find((t) => t.tier === last.toTier);
  const top = tiers.tiers.find((t) => t.tier === 1);
  const fromName = from?.name ?? `Tier ${last.fromTier}`;
  const toName = to?.name ?? `Tier ${last.toTier}`;
  const paid = MONEY_ENABLED && !!top && top.rewardInr > 0;

  const reachedTop = last.toTier === 1;
  const footer = top
    ? reachedTop
      ? paid
        ? `Every ${top.daysToStick} days in a row here pays ${formatInr(top.rewardInr)}.`
        : `The top of the Infinite board.`
      : `${plural(last.toTier - 1, "tier")} to ${top.name}${
          paid ? `, where every ${top.daysToStick} days pays ${formatInr(top.rewardInr)}` : ""
        }.`
    : null;

  async function share() {
    const text = `I just moved up to ${toName} on GuessWord Infinite! ${SITE_URL}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, title: "GuessWord" });
        return;
      } catch {
        // Dismissed or failed — fall back to copying below.
      }
    }
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const rows: [string, React.ReactNode][] = [];
  if (last.oldRank !== null && last.rankAtEntry !== null) {
    rows.push([
      "Position",
      <>
        #{last.oldRank} in {fromName} → <strong>#{last.rankAtEntry} in {toName}</strong>
      </>,
    ]);
  }
  if (change) {
    rows.push([
      "Points carried in",
      <>
        <strong>{change.carriedScore.toLocaleString("en-IN")}</strong>
        {change.oldScore > 0 &&
          ` (${Math.round((change.carriedScore / change.oldScore) * 100)}% of ${change.oldScore.toLocaleString("en-IN")})`}
      </>,
    ]);
  }
  if (to) {
    const targets = [to.minActiveMinutes > 0 ? `${to.minActiveMinutes} min` : null, plural(to.minGamesCompleted, "game")]
      .filter(Boolean)
      .join(" · ");
    rows.push(["Daily targets", <strong key="t">{targets}</strong>]);
  }
  rows.push([
    demoted ? `Back to ${fromName}` : reachedTop ? (paid ? "Reward cycle" : "Day count") : "To move up",
    <>
      <strong>
        {me.counter.stickDays} of {me.counter.daysToStick}
      </strong>{" "}
      days
    </>,
  ]);

  const leaderboardButton = (
    <button
      type="button"
      onClick={() => onSeeLeaderboard(last.toTier)}
      className="rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] md:rounded-[15px] md:px-7 md:py-[15px] md:text-[15px]"
    >
      See {toName} leaderboard
    </button>
  );
  const shareButton = (
    <button
      type="button"
      onClick={share}
      className="rounded-2xl border border-white/12 bg-white/7 p-[15px] text-[14.5px] font-semibold transition-colors hover:border-accent/40 md:rounded-[15px] md:px-6 md:text-[15px]"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
  // Demotion swaps Share for Play now — same styling.
  const secondaryButton = demoted ? (
    <button
      type="button"
      onClick={onPlay}
      className="rounded-2xl border border-white/12 bg-white/7 p-[15px] text-[14.5px] font-semibold transition-colors hover:border-accent/40 md:rounded-[15px] md:px-6 md:text-[15px]"
    >
      Play now
    </button>
  ) : (
    shareButton
  );
  const misses = tiers.demotion;
  const intro = demoted
    ? `${misses.misses} missed days in the last ${misses.windowDays} in ${fromName}. `
    : from
      ? `${from.daysToStick} qualifying days in a row in ${fromName}. `
      : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="promotion-title"
      className="fixed inset-0 z-40 flex animate-fade-in flex-col bg-background md:items-center md:justify-center md:bg-[#09060b]/55 md:p-14"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex flex-1 flex-col overflow-y-auto md:w-140 md:flex-none md:animate-fade-in-up md:gap-6 md:rounded-[28px] md:border md:border-white/10 md:bg-[#1f1725] md:p-10 md:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="flex justify-end px-6 pt-6 md:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-[34px] items-center justify-center rounded-xl bg-white/7 transition-colors hover:bg-white/12"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-[30px] pt-10 text-center md:p-0">
          <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${MUTED}`}>
            Moved {demoted ? "down" : "up"} overnight
          </span>
          <div className="flex items-center gap-[18px]">
            <span className="opacity-45">
              <BigBadge tier={last.fromTier} size="from" />
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="#9A8AA2" strokeWidth={2} strokeLinecap="round" className="size-[22px]">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <span className={demoted ? "" : "animate-tile-bounce"}>
              <BigBadge tier={last.toTier} size="to" />
            </span>
          </div>
          <h2
            id="promotion-title"
            className="font-display text-[36px] font-bold leading-[1.05] md:font-sans md:text-[40px] md:font-light md:tracking-[-0.03em]"
          >
            You&apos;re in {toName}
          </h2>
          <p className={`text-sm leading-[1.55] md:text-[14.5px] ${SOFT}`}>
            {intro}Your day count starts again at 0 here.
          </p>
        </div>

        {/* demotion: the old tier's last 7 days, when the backend sends them */}
        {missedWindow && missedWindow.length > 0 && (
          <div className="mx-6 mt-[22px] flex gap-1.5 md:m-0">
            {missedWindow.map((d) => (
              <span
                key={d.day}
                title={`${d.day} · ${d.qualified ? "qualified" : "missed"}`}
                className={`h-[22px] flex-1 rounded-md md:h-5 ${d.qualified ? "bg-[#5f8f49]" : "bg-[#b5543f]"}`}
              />
            ))}
          </div>
        )}

        <div className="mx-6 mt-7 flex flex-col rounded-[20px] border border-white/8 bg-[#1f1725] md:m-0 md:rounded-[18px] md:border-0 md:bg-white/4">
          {rows.map(([label, value], i) => (
            <div
              key={label}
              className={`flex justify-between gap-4 px-[18px] py-[15px] text-[13.5px] md:py-3.5 md:text-sm ${
                i < rows.length - 1 ? "border-b border-white/7" : ""
              }`}
            >
              <span className={MUTED}>{label}</span>
              <span className="text-right">{value}</span>
            </div>
          ))}
        </div>

        {footer && (
          <span className="mx-6 mt-4 text-center text-[13px] text-[#9fd4e6] md:m-0 md:text-[13.5px]">{footer}</span>
        )}

        {/* mobile: stacked, leaderboard first; desktop: right-aligned, secondary first */}
        <div className="mt-auto flex flex-col gap-2.5 px-6 pb-[26px] pt-[22px] md:hidden">
          {leaderboardButton}
          {secondaryButton}
        </div>
        <div className="hidden justify-end gap-3 md:flex">
          {secondaryButton}
          {leaderboardButton}
        </div>
      </div>
    </div>
  );
}

function BigBadge({ tier, size }: { tier: TierNumber; size: "from" | "to" }) {
  return (
    <span
      style={{ backgroundColor: TIER_COLORS[tier] }}
      className={`flex items-center justify-center font-display font-bold text-background ${
        size === "to" ? "size-[76px] rounded-[22px] text-[34px]" : "size-[52px] rounded-2xl text-[22px]"
      }`}
    >
      {tier}
    </span>
  );
}
