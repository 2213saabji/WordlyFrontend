"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import TierBadge from "@/components/TierBadge";
import { getInfiniteMe, getInfiniteTiers, getRewards, getVerificationStatus } from "@/lib/api";
import { readCache, writeCache } from "@/lib/cache";
import { MONEY_ENABLED } from "@/lib/flags";
import { formatInr } from "@/lib/tiers";
import type {
  InfiniteMeResponse,
  InfiniteTiersResponse,
  Payout,
  RewardStatus,
  VerificationItem,
  VerificationStatusResponse,
  VerificationStep,
} from "@/types";

// Shared with the hub / tier screens.
const ME_CACHE_KEY = "infinite:me";
const TIERS_CACHE_KEY = "infinite:tiers";
const REWARDS_CACHE_KEY = "infinite:rewards";
const VERIFICATION_CACHE_KEY = "infinite:verification";

const MUTED = "text-[#9a8aa2]";
const DIAMOND = "#9fd4e6";
const CARD = "rounded-[20px] border border-white/8 bg-white/[0.045] md:rounded-[22px]";

const STEP_LABEL: Record<VerificationStep, string> = { mobile: "Mobile", email: "Email", bank: "Bank account" };
const STEP_CTA: Record<VerificationStep, string> = {
  mobile: "Verify mobile number",
  email: "Verify email",
  bank: "Add bank account",
};

/** "9 Oct" for an IST day key (formatted in UTC so the local zone can't shift it). */
function shortDate(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Tier 1's cycle screen. With MONEY_ENABLED: the ₹ reward tracker —
 * verification steps and payout history. Without: the same cycle framed as
 * Diamond stars, one per completed cycle. */
export default function DiamondStatusScreen({
  onBack,
  onPlay,
  onVerify,
}: {
  onBack: () => void;
  onPlay: () => void;
  /** Opens the verification flow at a step — omitted until those screens exist. */
  onVerify?: (step: VerificationStep) => void;
}) {
  const [me, setMe] = useState<InfiniteMeResponse | null>(() => readCache<InfiniteMeResponse>(ME_CACHE_KEY));
  const [tiers, setTiers] = useState<InfiniteTiersResponse | null>(() =>
    readCache<InfiniteTiersResponse>(TIERS_CACHE_KEY),
  );
  const [rewards, setRewards] = useState<RewardStatus | null>(() => readCache<RewardStatus>(REWARDS_CACHE_KEY));
  const [verification, setVerification] = useState<VerificationStatusResponse | null>(() =>
    MONEY_ENABLED ? readCache<VerificationStatusResponse>(VERIFICATION_CACHE_KEY) : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getInfiniteMe()
      .then((res) => {
        writeCache(ME_CACHE_KEY, res);
        setMe(res);
      })
      .catch(() => setFailed(true));
    getInfiniteTiers()
      .then((res) => {
        writeCache(TIERS_CACHE_KEY, res);
        setTiers(res);
      })
      .catch(() => {});
    // Completed cycles come from the payout log in both modes (ASSUMED —
    // the contract has no money-free source for them; see the report).
    getRewards()
      .then((res) => {
        writeCache(REWARDS_CACHE_KEY, res);
        setRewards(res);
      })
      .catch(() => {});
    if (MONEY_ENABLED) {
      getVerificationStatus()
        .then((res) => {
          writeCache(VERIFICATION_CACHE_KEY, res);
          setVerification(res);
        })
        .catch(() => {});
    }
  }, []);

  const title = MONEY_ENABLED ? "Diamond reward" : "Diamond";

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
  const rewardInr = top?.rewardInr ?? 0;
  const paid = MONEY_ENABLED && rewardInr > 0;
  const { stickDays, daysToStick, daysLeft } = me.counter;
  // Qualifying today and every remaining day completes the cycle on this date.
  const until = shortDate(addDays(me.today.day, Math.max(0, daysLeft - 1)));
  const completed = [...(rewards?.payouts ?? [])].sort((a, b) => a.cycle - b.cycle);

  const goal = paid ? (
    <strong style={{ color: DIAMOND }}>{formatInr(rewardInr)}</strong>
  ) : (
    <>
      a <strong style={{ color: DIAMOND }}>{topName} star</strong>
    </>
  );
  const cycleText = (
    <>
      Qualify every day until <strong>{until}</strong> to earn {goal}. A missed day restarts the cycle.
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

  // --- money: verification + payouts ---
  const steps: VerificationStep[] = ["mobile", "email", "bank"];
  const stepsLeft = verification ? steps.filter((s) => verification[s].status !== "verified").length : 0;
  const nextStep = verification?.nextStep ?? null;

  const verificationCard = paid && verification && (
    <div className={`flex flex-col ${CARD}`}>
      <div className="flex items-center justify-between border-b border-white/7 px-[18px] py-3.5 md:px-5 md:py-4">
        <span className="text-sm font-semibold md:text-[15px]">Verification</span>
        <span className={`text-xs md:text-[13px] ${stepsLeft > 0 ? "text-accent" : "text-[#8fc274]"}`}>
          {stepsLeft > 0 ? `${stepsLeft} step${stepsLeft === 1 ? "" : "s"} left` : "Complete"}
        </span>
      </div>
      {steps.map((s, i) => (
        <VerificationRow
          key={s}
          label={STEP_LABEL[s]}
          item={verification[s]}
          last={i === steps.length - 1}
          onAction={onVerify ? () => onVerify(s) : undefined}
        />
      ))}
      {verification.reviewCase && (
        <p className={`border-t border-white/7 px-[18px] py-3 text-[12.5px] md:px-5 ${MUTED}`}>
          Your payout is on hold for review. You keep your tier while we check.
        </p>
      )}
    </div>
  );

  const payoutsList = paid && completed.length > 0 && (
    <div className="flex flex-col md:rounded-[22px] md:border md:border-white/8 md:bg-white/[0.043]">
      <span className="pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6f6376] md:border-b md:border-white/7 md:px-5 md:py-4 md:text-[15px] md:normal-case md:tracking-normal md:text-foreground">
        Payouts
      </span>
      {[...completed].reverse().map((p, i, all) => (
        <div
          key={p.cycle}
          className={`flex justify-between gap-3 py-3 text-[13.5px] md:px-5 md:text-sm ${
            i < all.length - 1 ? "border-b border-white/7" : ""
          }`}
        >
          <span>
            Cycle {p.cycle} · {shortDate(p.eligibleDay)}
          </span>
          <PayoutStatusText payout={p} nextStep={nextStep} amount={rewardInr} />
        </div>
      ))}
    </div>
  );

  // --- no money: stars + completed cycles ---
  const stars = (large: boolean) => (
    <div className={`flex flex-wrap ${large ? "gap-2.5" : "gap-2"}`}>
      {completed.map((p) => (
        <span
          key={p.cycle}
          title={`Cycle ${p.cycle} · ${shortDate(p.eligibleDay)}`}
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
  const starsCard = !paid && rewards && (
    <div className={`flex flex-col gap-3 p-[18px] md:gap-3.5 md:p-6 ${CARD}`}>
      <span className="text-sm font-semibold md:text-[15px]">{topName} stars</span>
      <div className="md:hidden">{stars(false)}</div>
      <div className="hidden md:block">{stars(true)}</div>
      {completed.length === 0 ? (
        <span className={`text-[12.5px] md:text-[13.5px] ${MUTED}`}>Complete a cycle to earn your first star.</span>
      ) : (
        <span className={`hidden text-[13.5px] md:block ${MUTED}`}>
          {completed.map((p) => `Cycle ${p.cycle} · ${shortDate(p.eligibleDay)}.`).join(" ")}
        </span>
      )}
    </div>
  );
  const completedList = !paid && completed.length > 0 && (
    <div className="flex flex-col md:hidden">
      <span className="pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#6f6376]">Completed cycles</span>
      {[...completed].reverse().map((p, i, all) => (
        <div
          key={p.cycle}
          className={`flex justify-between py-3 text-[13.5px] ${i < all.length - 1 ? "border-b border-white/7" : ""}`}
        >
          <span>Cycle {p.cycle}</span>
          <span className={MUTED}>{shortDate(p.eligibleDay)}</span>
        </div>
      ))}
    </div>
  );

  const cta =
    paid && nextStep && onVerify ? (
      <button type="button" onClick={() => onVerify(nextStep)} className={CTA_CLASS}>
        {STEP_CTA[nextStep]}
      </button>
    ) : (
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

        {verificationCard && <div className="mt-3.5">{verificationCard}</div>}
        {payoutsList && <div className="mt-3.5">{payoutsList}</div>}
        {starsCard && <div className="mt-3.5">{starsCard}</div>}
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
          {verificationCard}
          {payoutsList}
          {starsCard}
        </div>
      </div>
    </div>
  );
}

const CTA_CLASS =
  "w-full rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] md:w-auto md:whitespace-nowrap md:rounded-[14px] md:px-[26px] md:py-[13px] md:text-[14.5px]";

function VerificationRow({
  label,
  item,
  last,
  onAction,
}: {
  label: string;
  item: VerificationItem;
  last: boolean;
  onAction?: () => void;
}) {
  const done = item.status === "verified";
  const right = done ? (
    <span className={MUTED}>{item.masked}</span>
  ) : item.status === "pending" ? (
    <span className={MUTED}>Checking…</span>
  ) : item.status === "name_mismatch" ? (
    <ActionLink label="Name didn't match · Fix" onAction={onAction} danger />
  ) : (
    <ActionLink label="Add" onAction={onAction} />
  );

  return (
    <div
      className={`flex items-center gap-2.5 px-[18px] text-[13.5px] md:px-5 md:text-sm ${
        last ? "pb-4 pt-3 md:pb-[18px] md:pt-[13px]" : "py-3 md:py-[13px]"
      }`}
    >
      {done ? (
        <span className="flex size-[18px] flex-none items-center justify-center rounded-full bg-[#5f8f49] text-[11px]">✓</span>
      ) : (
        <span className="size-[18px] flex-none rounded-full border-2 border-accent" />
      )}
      {label}
      <span className="ml-auto text-right">{right}</span>
    </div>
  );
}

function ActionLink({ label, onAction, danger = false }: { label: string; onAction?: () => void; danger?: boolean }) {
  const color = danger ? "text-danger" : "text-accent";
  if (!onAction) return <span className={`font-semibold ${color}`}>{label}</span>;
  return (
    <button
      type="button"
      onClick={onAction}
      className={`font-semibold ${color} md:rounded-[10px] ${
        danger ? "" : "md:bg-accent md:px-3.5 md:py-[7px] md:text-[13px] md:font-bold md:text-background"
      }`}
    >
      {label}
    </button>
  );
}

function PayoutStatusText({ payout, nextStep, amount }: { payout: Payout; nextStep: VerificationStep | null; amount: number }) {
  switch (payout.status) {
    case "paid":
      return <span className="text-[#8fc274]">{formatInr(payout.amountInr || amount)} paid</span>;
    case "processing":
      return <span className={MUTED}>Processing</span>;
    case "failed":
      return <span className="text-danger">Failed</span>;
    default:
      return (
        <span className="text-accent">
          {nextStep ? `Pending: ${nextStep === "bank" ? "bank" : nextStep} needed` : "Pending"}
        </span>
      );
  }
}
