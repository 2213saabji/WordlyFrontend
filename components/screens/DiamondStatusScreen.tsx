"use client";

import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import TierBadge from "@/components/TierBadge";
import { getInfiniteMe, getInfiniteTiers } from "@/lib/api";
import { useSyncedResource } from "@/lib/use-synced";
import type { InfiniteMeResponse, InfiniteTiersResponse } from "@/types";

// Shared with the hub / tier screens.
const ME_CACHE_KEY = "infinite:me";
const TIERS_CACHE_KEY = "infinite:tiers";

const MUTED = "text-[#9a8aa2]";
const DIAMOND = "#9fd4e6";
const CARD = "rounded-[20px] border border-white/8 bg-white/[0.045] md:rounded-[22px]";

/** "9 Oct" for an IST day key (formatted in UTC so the local zone can't shift it). */
function shortDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Tier 1's cycle screen: the current Diamond cycle, plus a Diamond star for
 * every completed cycle. */
export default function DiamondStatusScreen({ onBack, onPlay }: { onBack: () => void; onPlay: () => void }) {
  // Synced (lib/use-synced.ts): cached, refetched only when /sync says so.
  const meRes = useSyncedResource({ flag: "infinite", key: ME_CACHE_KEY, fetcher: getInfiniteMe });
  const me: InfiniteMeResponse | null = meRes.data;
  const failed = meRes.failed;
  const tiers: InfiniteTiersResponse | null = useSyncedResource({
    flag: "tiers",
    key: TIERS_CACHE_KEY,
    fetcher: getInfiniteTiers,
  }).data;

  const title = "Diamond";

  if (!me) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-5 py-6 md:px-8 md:py-14">
        <ScreenHeader title={title} onBack={onBack} />
        {failed ? (
          <p className={`text-sm ${MUTED}`}>Your Diamond status couldn&apos;t load right now.</p>
        ) : (
          <Loader label="Loading…" />
        )}
      </div>
    );
  }

  const top = tiers?.tiers.find((t) => t.tier === 1);
  const topName = top?.name ?? me.tierName;
  const { stickDays, daysToStick, daysLeft } = me.counter;
  // Qualifying today and every remaining day completes the cycle on this date.
  const until = shortDate(addDays(me.today.day, Math.max(0, daysLeft - 1)));
  // completedCycles is new in v0.2 — absent from an /infinite/me cached before it.
  const completed = [...(me.completedCycles ?? [])].sort((a, b) => a.cycle - b.cycle);

  const cycleText = (
    <>
      Qualify every day until <strong>{until}</strong> to earn a <strong style={{ color: DIAMOND }}>{topName} star</strong>.
      A missed day restarts the cycle.
    </>
  );

  const cycleSegments = (large: boolean) => (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${large ? daysToStick : Math.ceil(daysToStick / 2)}, minmax(0, 1fr))`,
        gap: large ? 4 : 3,
      }}
    >
      {Array.from({ length: daysToStick }, (_, i) => (
        <span
          key={i}
          className={large ? "h-3.5 rounded-sm" : "h-2.5 rounded-[3px]"}
          style={{ backgroundColor: i < stickDays ? DIAMOND : "rgba(255,255,255,0.1)" }}
        />
      ))}
    </div>
  );

  // --- stars + completed cycles ---
  const stars = (large: boolean) => (
    <div className={`flex flex-wrap ${large ? "gap-2.5" : "gap-2"}`}>
      {completed.map((p) => (
        <span
          key={p.cycle}
          title={`Cycle ${p.cycle} · ${shortDate(p.day)}`}
          style={{ backgroundColor: DIAMOND }}
          className={`flex items-center justify-center text-background ${
            large ? "size-[46px] rounded-[13px] text-xl" : "size-10 rounded-xl text-lg"
          }`}
        >
          ★
        </span>
      ))}
      <span
        className={`border-2 border-dashed border-[#9fd4e6]/40 ${large ? "size-[46px] rounded-[13px]" : "size-10 rounded-xl"}`}
      />
    </div>
  );
  const starsCard = (
    <div className={`flex flex-col gap-3 p-[18px] md:gap-3.5 md:p-6 ${CARD}`}>
      <span className="text-sm font-semibold md:text-[15px]">{topName} stars</span>
      <div className="md:hidden">{stars(false)}</div>
      <div className="hidden md:block">{stars(true)}</div>
      {completed.length === 0 ? (
        <span className={`text-[12.5px] md:text-[13.5px] ${MUTED}`}>Complete a cycle to earn your first star.</span>
      ) : (
        <span className={`hidden text-[13.5px] md:block ${MUTED}`}>
          {completed.map((p) => `Cycle ${p.cycle} · ${shortDate(p.day)}.`).join(" ")}
        </span>
      )}
    </div>
  );
  const completedList = completed.length > 0 && (
    <div className="flex flex-col md:hidden">
      <span className="pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6f6376]">Completed cycles</span>
      {[...completed].reverse().map((p, i, all) => (
        <div
          key={p.cycle}
          className={`flex justify-between py-3 text-[13.5px] ${i < all.length - 1 ? "border-b border-white/7" : ""}`}
        >
          <span>Cycle {p.cycle}</span>
          <span className={MUTED}>{shortDate(p.day)}</span>
        </div>
      ))}
    </div>
  );

  const cta = (
    <button type="button" onClick={onPlay} className={CTA_CLASS}>
      Play next word
    </button>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-6 pt-6 md:gap-8 md:px-8 md:py-14">
      {/* ---------- mobile ---------- */}
      <div className="flex flex-1 flex-col md:hidden">
        <ScreenHeader title={title} onBack={onBack} />

        <div className="mt-4 flex flex-col gap-3.5 rounded-[22px] border border-[#9fd4e6]/30 bg-[#9fd4e6]/8 p-[22px]">
          <div className="flex items-center gap-3.5">
            <TierBadge tier={1} size="lg" />
            <span className="flex flex-col gap-[3px]">
              <span className={`text-[12.5px] ${MUTED}`}>This cycle</span>
              <span className="font-display text-[26px] font-bold">
                Day {stickDays} <span className={`text-[15px] ${MUTED}`}>of {daysToStick}</span>
              </span>
            </span>
          </div>
          {cycleSegments(false)}
          <span className="text-[13.5px] leading-normal">{cycleText}</span>
        </div>

        <div className="mt-3.5">{starsCard}</div>
        {completedList && <div className="mt-3.5">{completedList}</div>}

        <div className="mt-auto flex flex-col pt-[22px]">{cta}</div>
      </div>

      {/* ---------- desktop ---------- */}
      <div className="hidden items-end justify-between gap-8 md:flex">
        <div className="flex flex-col gap-3">
          <span className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${MUTED}`}>Infinite · Tier 1</span>
          <h1 className="text-[52px] font-light leading-[1.05] tracking-[-0.03em]">{title}</h1>
        </div>
        <div className="w-auto">{cta}</div>
      </div>

      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start gap-5 md:grid">
        <div className="flex flex-col gap-[18px] rounded-3xl border border-[#9fd4e6]/30 bg-[#9fd4e6]/7 p-[30px]">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-[#c9bfcc]">This cycle</span>
            <span className="font-display text-[44px] font-bold">
              {stickDays}
              <span className={`text-xl ${MUTED}`}> / {daysToStick}</span>
            </span>
          </div>
          {cycleSegments(true)}
          <span className="text-[14.5px] leading-[1.55]">{cycleText}</span>
        </div>
        <div className="flex flex-col gap-3.5">
          {starsCard}
        </div>
      </div>
    </div>
  );
}

const CTA_CLASS =
  "w-full rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] md:w-auto md:whitespace-nowrap md:rounded-[14px] md:px-[26px] md:py-[13px] md:text-[14.5px]";
