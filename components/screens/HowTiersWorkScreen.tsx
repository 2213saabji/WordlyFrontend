"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import TierBadge from "@/components/TierBadge";
import { getInfiniteTiers } from "@/lib/api";
import { readCache, writeCache } from "@/lib/cache";
import { MONEY_ENABLED } from "@/lib/flags";
import { CARRY_IN_PERCENT, formatInr, plural } from "@/lib/tiers";
import type { InfiniteMeResponse, InfiniteTiersResponse, TierDefinition } from "@/types";

// Shared with the hub and tier leaderboard, so any of them seeds this one.
const ME_CACHE_KEY = "infinite:me";
const TIERS_CACHE_KEY = "infinite:tiers";
const MUTED = "text-[#9a8aa2]";
const SOFT = "text-[#c9bfcc]";
const DIAMOND_TEXT = "text-[#9fd4e6]";

/** The tier ladder explained: each tier's daily targets, hints and days to
 * stick, straight from the server's TierConfig, plus the promotion/demotion
 * rules. With MONEY_ENABLED off, Diamond's reward reads as a profile star
 * instead of ₹. */
export default function HowTiersWorkScreen({ onBack }: { onBack: () => void }) {
  const [tiers, setTiers] = useState<InfiniteTiersResponse | null>(() =>
    readCache<InfiniteTiersResponse>(TIERS_CACHE_KEY),
  );
  const [failed, setFailed] = useState(false);
  // Only used to mark "· you" — whatever the hub last saw is good enough.
  const [myTier] = useState(() => readCache<InfiniteMeResponse>(ME_CACHE_KEY)?.tier);

  useEffect(() => {
    getInfiniteTiers()
      .then((res) => {
        setTiers(res);
        writeCache(TIERS_CACHE_KEY, res);
      })
      .catch(() => setFailed(true));
  }, []);

  const intro =
    "Meet your tier's daily targets for enough days in a row to move up. Your day count restarts at 0 in every new tier.";

  if (!tiers) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-5 py-6 md:px-8 md:py-14">
        <ScreenHeader title="How tiers work" onBack={onBack} />
        {failed ? (
          <p className={`text-sm ${MUTED}`}>The tier ladder couldn&apos;t load right now.</p>
        ) : (
          <Loader label="Loading tiers…" />
        )}
      </div>
    );
  }

  const ladder = [...tiers.tiers].sort((a, b) => a.tier - b.tier);
  const top = ladder.find((t) => t.tier === 1);
  const paid = MONEY_ENABLED && !!top && top.rewardInr > 0;

  const rules = (
    <>
      <span>
        Miss your targets on {tiers.demotion.misses} days in any {tiers.demotion.windowDays} and you drop one tier.
      </span>
      <span>Moving up or down keeps {CARRY_IN_PERCENT}% of your points and resets your day count to 0.</span>
      <span className="hidden md:inline">The day resets at {tiers.resetTimeIst} IST.</span>
      {top && (
        <span className={DIAMOND_TEXT}>
          In {top.name}, every {top.daysToStick} days in a row earns{" "}
          {paid ? `${formatInr(top.rewardInr)}, paid to a verified bank account.` : `a ${top.name} star on your profile.`}
        </span>
      )}
    </>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-6 md:gap-8 md:px-8 md:py-14">
      {/* ---------- mobile ---------- */}
      <div className="flex flex-col md:hidden">
        <ScreenHeader title="How tiers work" onBack={onBack} />
        <p className={`mt-3 text-[13.5px] leading-[1.55] ${SOFT}`}>{intro}</p>

        <div className="mt-[18px] flex flex-col gap-1.5">
          {ladder.map((t) => {
            const isMine = t.tier === myTier;
            return (
              <div
                key={t.tier}
                className={`flex items-center gap-3 rounded-[14px] border px-3 py-[11px] ${
                  isMine ? "border-accent/40 bg-accent/10" : "border-white/6 bg-white/3"
                }`}
              >
                <TierBadge tier={t.tier} size="md" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold">
                    {t.name}
                    {isMine && " · you"}
                  </span>
                  <span className={`text-[11.5px] ${MUTED}`}>{targetsLine(t)}</span>
                </span>
                <span className="ml-auto flex flex-col gap-0.5 text-right">
                  <span className={`text-[13px] font-semibold ${t.tier === 1 ? DIAMOND_TEXT : ""}`}>
                    {plural(t.daysToStick, "day")}
                  </span>
                  <span className={`text-[11px] ${MUTED}`}>
                    {t.tier === 1 ? (paid ? `${formatInr(t.rewardInr)} each cycle` : "star each cycle") : "to move up"}
                  </span>
                </span>
              </div>
            );
          })}
        </div>

        <div className={`mt-[18px] flex flex-col gap-2 rounded-2xl bg-white/[0.045] px-[18px] py-4 text-[12.5px] leading-normal ${SOFT}`}>
          {rules}
        </div>
      </div>

      {/* ---------- desktop ---------- */}
      <div className="hidden max-w-180 flex-col gap-3 md:flex">
        <span className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${MUTED}`}>Infinite</span>
        <h1 className="text-[52px] font-light leading-[1.05] tracking-[-0.03em]">How tiers work</h1>
        <span className={`text-[15px] leading-[1.6] ${SOFT}`}>{intro}</span>
      </div>

      <div className="hidden grid-cols-[minmax(0,1fr)_380px] items-start gap-5 md:grid">
        <div className="overflow-hidden rounded-3xl border border-white/8 bg-white/[0.043]">
          <div
            className={`grid grid-cols-[minmax(0,1fr)_130px_130px_110px_150px] gap-4 border-b border-white/8 px-7 py-4 text-xs font-semibold uppercase tracking-[0.14em] ${MUTED}`}
          >
            <span>Tier</span>
            <span>Time / day</span>
            <span>Games / day</span>
            <span>Hints</span>
            <span>Days in a row</span>
          </div>
          {ladder.map((t) => {
            const isMine = t.tier === myTier;
            return (
              <div
                key={t.tier}
                className={`grid grid-cols-[minmax(0,1fr)_130px_130px_110px_150px] items-center gap-4 border-b border-white/7 px-7 py-3.5 text-[15px] last:border-b-0 ${
                  isMine ? "bg-accent/8" : ""
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <TierBadge tier={t.tier} size="md" />
                  <span className="truncate text-[15.5px] font-semibold">
                    {t.name}
                    {isMine && " · you"}
                  </span>
                </span>
                <span className={SOFT}>{t.minActiveMinutes > 0 ? `${t.minActiveMinutes} min` : "—"}</span>
                <span className={SOFT}>{t.minGamesCompleted}</span>
                <span className={SOFT}>{t.hintsEnabled ? "On" : "Off"}</span>
                <span className={t.tier === 1 ? DIAMOND_TEXT : ""}>
                  {t.daysToStick}
                  {t.tier === 1 && (paid ? ` · ${formatInr(t.rewardInr)}` : " · ★")}
                </span>
              </div>
            );
          })}
        </div>

        <div className={`flex flex-col gap-3 rounded-[22px] border border-white/8 bg-white/[0.043] p-6 text-sm leading-[1.55] ${SOFT}`}>
          {rules}
        </div>
      </div>
    </div>
  );
}

/** "60 min · 20 games · no hints"; Stone has no time target: "1 game · hints on". */
function targetsLine(t: TierDefinition): string {
  const parts = [];
  if (t.minActiveMinutes > 0) parts.push(`${t.minActiveMinutes} min`);
  parts.push(plural(t.minGamesCompleted, "game"));
  parts.push(t.hintsEnabled ? "hints on" : "no hints");
  return parts.join(" · ");
}
