"use client";

import { useEffect, useState } from "react";
import { CoinIcon } from "@/components/CoinChip";
import { SheetFrame } from "@/components/SheetFrame";
import { checkCustomRupees, type PurchaseError } from "@/lib/purchase";
import { formatCoins, formatPaise } from "@/lib/tiers";
import type { CustomCoinAmount } from "@/types";

// Buying coins, shared by the Coins screen and the hint flow's coin sheet:
// the custom-amount card, the purchase-done celebration and the sheet for a
// payment that failed, was cancelled or is still being confirmed.

const MUTED = "text-[#9a8aa2]";
const SOFT = "text-[#c9bfcc]";
const COIN = "text-[#e3b75a]";
const fmt = (n: number) => n.toLocaleString("en-IN");

const PRIMARY =
  "rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 md:rounded-[15px] md:p-[15px] md:text-[15px]";
const SECONDARY =
  "rounded-2xl border border-white/12 bg-white/7 p-4 text-[14.5px] font-semibold transition-colors hover:border-accent/40 disabled:opacity-60 md:rounded-[15px] md:p-[14px]";

/** "gu••@gmail.com" */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return domain ? `${name.slice(0, 2)}••@${domain}` : email;
}

function hintsLabel(n: number): string {
  return `${fmt(n)} hint${n === 1 ? "" : "s"}`;
}

// --- Custom amount ---------------------------------------------------------------

/**
 * "Custom amount": any amount from the server's minimum to maximum in its
 * steps (₹10 to ₹1,000 in ₹10s), with − / + and a few quick picks, showing
 * the coins (and hints) it buys. `onBuy` gets the amount in paise.
 */
export function CustomAmountCard({
  rules,
  hintCost,
  buying,
  disabled,
  onBuy,
  variant,
}: {
  rules: CustomCoinAmount;
  hintCost: number | null;
  /** This card's purchase is starting. */
  buying: boolean;
  disabled: boolean;
  onBuy: (amountPaise: number) => void;
  variant: "mobile" | "desktop" | "sheet";
}) {
  const minRupees = rules.minPaise / 100;
  const maxRupees = rules.maxPaise / 100;
  const stepRupees = rules.stepPaise / 100;
  const [text, setText] = useState(() => String(Math.min(maxRupees, Math.max(minRupees, stepRupees * 5))));

  const rupees = text === "" ? NaN : Number(text);
  const check = checkCustomRupees(rupees, rules);
  const valid = check === "ok";
  const coins = valid ? rupees * rules.coinsPerRupee : null;
  const hints = coins !== null && hintCost ? Math.floor(coins / hintCost) : null;

  const stepBy = (dir: 1 | -1) => {
    const base = Number.isFinite(rupees) ? rupees : minRupees;
    // Off-step values snap to the next step in that direction first.
    const snapped = dir > 0 ? Math.floor(base / stepRupees) * stepRupees + stepRupees : Math.ceil(base / stepRupees) * stepRupees - stepRupees;
    setText(String(Math.min(maxRupees, Math.max(minRupees, snapped))));
  };

  const quickPicks = [50, 100, 200].filter((r) => checkCustomRupees(r, rules) === "ok");
  const helper =
    check === "min"
      ? `Minimum ${formatPaise(rules.minPaise)}`
      : check === "max"
        ? `Maximum ${formatPaise(rules.maxPaise)} per payment`
        : check === "step"
          ? `Use a multiple of ${formatPaise(rules.stepPaise)}, like ${formatPaise(Math.max(minRupees, Math.round(rupees / stepRupees) * stepRupees) * 100)}`
          : null;

  const desktop = variant === "desktop";
  const frame =
    variant === "desktop"
      ? "gap-4 rounded-3xl border border-white/8 bg-white/[0.043] px-7 py-6"
      : variant === "mobile"
        ? "gap-3 rounded-[20px] border border-white/8 bg-[#1f1725] p-[18px]"
        : "gap-3 rounded-2xl border border-white/10 bg-white/4 p-4";
  const stepButton =
    "flex size-11 flex-none items-center justify-center rounded-xl border border-white/12 bg-white/7 text-xl font-semibold transition-colors hover:border-accent/40 disabled:opacity-40";

  return (
    <div className={`flex flex-col ${frame}`}>
      <span className="flex items-baseline justify-between gap-3">
        <span className={`font-bold ${desktop ? "text-xl" : "text-base"}`}>Custom amount</span>
        <span className={`text-right text-xs ${MUTED}`}>
          {formatPaise(rules.minPaise)}–{formatPaise(rules.maxPaise)} · steps of {formatPaise(rules.stepPaise)}
        </span>
      </span>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label={`${formatPaise(rules.stepPaise)} less`}
          onClick={() => stepBy(-1)}
          disabled={disabled || (Number.isFinite(rupees) && rupees <= minRupees)}
          className={stepButton}
        >
          −
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-white/15 bg-[#140f18] px-3.5 py-2 focus-within:border-accent">
          <span className={`text-lg font-semibold ${SOFT}`}>₹</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Amount in rupees"
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 6))}
            className="w-full min-w-0 bg-transparent text-lg font-bold outline-none"
          />
        </label>
        <button
          type="button"
          aria-label={`${formatPaise(rules.stepPaise)} more`}
          onClick={() => stepBy(1)}
          disabled={disabled || (Number.isFinite(rupees) && rupees >= maxRupees)}
          className={stepButton}
        >
          +
        </button>
      </div>

      {quickPicks.length > 0 && (
        <div className="flex gap-2">
          {quickPicks.map((r) => (
            <button
              key={r}
              type="button"
              disabled={disabled}
              onClick={() => setText(String(r))}
              className={`flex-1 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                rupees === r ? "border-accent bg-accent/14 text-accent" : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              ₹{r}
            </button>
          ))}
        </div>
      )}

      <span aria-live="polite" className={`text-[12.5px] ${helper ? "text-danger" : SOFT}`}>
        {helper ?? (
          <>
            <CoinIcon className="mr-1.5 inline-block size-3 align-[-1px]" />
            <strong className={COIN}>{formatCoins(coins ?? 0)}</strong>
            {hints !== null && hints > 0 ? ` · enough for ${hintsLabel(hints)}` : ""}
          </>
        )}
      </span>

      <button
        type="button"
        onClick={() => valid && onBuy(Math.round(rupees * 100))}
        disabled={disabled || !valid}
        className={`whitespace-nowrap bg-accent font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${
          desktop ? "rounded-[14px] px-[26px] py-3.5 text-[15px]" : "rounded-xl px-4 py-3 text-sm"
        }`}
      >
        {buying ? "Opening…" : valid ? `Buy for ${formatPaise(Math.round(rupees * 100))}` : "Buy"}
      </button>
    </div>
  );
}

// --- Purchase done ----------------------------------------------------------------

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Counts up to `target` over `ms` (straight to it with reduced motion). */
function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

// Where each spark flies to, around the coin.
const SPARKS = [
  [0, -58], [41, -41], [58, 0], [41, 41], [0, 58], [-41, 41], [-58, 0], [-41, -41],
  [22, -54], [54, 22], [-22, 54], [-54, -22],
] as const;

/** The coins just landed: a coin drop with sparks, the count-up, the new
 * balance and the hints it unlocks. Bottom sheet on mobile, dialog on
 * desktop. */
export function PurchaseSuccessSheet({
  coins,
  pricePaise,
  balance,
  orderId,
  email,
  hintCost,
  onDone,
  onClose,
}: {
  coins: number;
  pricePaise: number;
  balance: number;
  orderId: string;
  email?: string;
  /** A paid hint's price, for "N hints ready" (null: not shown). */
  hintCost: number | null;
  onDone: () => void;
  onClose: () => void;
}) {
  const counted = useCountUp(coins);
  const hints = hintCost ? Math.floor(balance / hintCost) : null;

  return (
    <SheetFrame title={`${formatCoins(coins)} added`} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative mt-3 flex size-28 items-center justify-center [perspective:400px]">
          <span aria-hidden className="absolute inset-2 animate-coin-glow rounded-full bg-[#e3b75a]/35 blur-2xl" />
          {SPARKS.map(([x, y], i) => (
            <span
              key={i}
              aria-hidden
              className={`absolute size-1.5 animate-coin-spark rounded-full ${i % 3 === 0 ? "bg-accent" : "bg-[#e3b75a]"}`}
              style={{ ["--spark-x" as string]: `${x}px`, ["--spark-y" as string]: `${y}px`, animationDelay: `${180 + (i % 4) * 60}ms` }}
            />
          ))}
          <CoinIcon className="relative size-[68px] animate-coin-burst border-4 shadow-[0_0_30px_rgba(227,183,90,0.45)]" />
        </div>

        <span className={`text-[11.5px] font-semibold uppercase tracking-[0.2em] ${COIN}`}>Payment successful</span>
        <span className="flex flex-col items-center gap-1">
          <span className="font-display text-[40px] font-bold leading-none tabular-nums md:text-[44px]">
            +{fmt(counted)}
          </span>
          <span className={`text-[14.5px] ${SOFT}`}>coins added to your wallet</span>
        </span>

        <div className="grid w-full grid-cols-2 overflow-hidden rounded-2xl border border-white/8 bg-white/4 text-left">
          <span className={`flex flex-col gap-0.5 px-4 py-3 ${hints !== null ? "border-r border-white/8" : "col-span-2"}`}>
            <span className={`text-[11.5px] ${MUTED}`}>New balance</span>
            <span className="flex items-center gap-1.5 text-[17px] font-bold">
              <CoinIcon className="size-3.5" />
              {fmt(balance)}
            </span>
          </span>
          {hints !== null && (
            <span className="flex flex-col gap-0.5 px-4 py-3">
              <span className={`text-[11.5px] ${MUTED}`}>Hints ready</span>
              <span className="text-[17px] font-bold">💡 {fmt(hints)}</span>
            </span>
          )}
        </div>

        <span className={`text-[13.5px] leading-normal ${SOFT}`}>
          {hints
            ? `Stuck on a tough word? You can now unlock ${hintsLabel(hints)} — one tap on “Need a hint?”.`
            : "Your coins are ready to use on hints."}
        </span>

        <button type="button" onClick={onDone} className={`self-stretch ${PRIMARY}`}>
          Back to the game
        </button>
        <span className={`text-[11.5px] ${MUTED}`}>
          {formatPaise(pricePaise)} paid · Order {orderId}
          {email ? ` · receipt sent to ${maskEmail(email)}` : ""}
        </span>
      </div>
    </SheetFrame>
  );
}

// --- Failed, cancelled, still confirming ------------------------------------------

function ProblemIcon({ tone }: { tone: "danger" | "neutral" | "wait" }) {
  const ring =
    tone === "danger" ? "bg-danger/14 text-danger" : tone === "wait" ? "bg-[#e3b75a]/14 text-[#e3b75a]" : "bg-white/8 text-[#c9bfcc]";
  return (
    <span className={`flex size-16 animate-pop items-center justify-center rounded-full ${ring}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-8">
        {tone === "danger" ? (
          <path d="M18 6 6 18M6 6l12 12" />
        ) : tone === "wait" ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </>
        ) : (
          <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-2" />
        )}
      </svg>
    </span>
  );
}

/**
 * After a payment that didn't add coins: failed (with PayU's reason when
 * given), cancelled on PayU's page, still being confirmed, or couldn't
 * start. "Try again" starts the same purchase again; "Check again" (still
 * confirming) asks the server once more.
 */
export function PurchaseProblemSheet({
  error,
  busy,
  onRetry,
  onCheckAgain,
  onClose,
}: {
  error: PurchaseError;
  busy: boolean;
  onRetry?: () => void;
  onCheckAgain?: () => void;
  onClose: () => void;
}) {
  const content =
    error.kind === "failed"
      ? {
          tone: "danger" as const,
          title: "Payment didn't go through",
          body: "No money was taken from your account. Try again — or pick UPI or another card on PayU's page.",
        }
      : error.kind === "cancelled"
        ? {
            tone: "neutral" as const,
            title: "Payment cancelled",
            body: "You left PayU before paying, so nothing was charged. Your coins are still one tap away.",
          }
        : error.kind === "pending"
          ? {
              tone: "wait" as const,
              title: "Still confirming your payment",
              body: "PayU hasn't confirmed it yet. If money left your account, your coins are added automatically — usually within a few minutes. Nothing is lost.",
            }
          : { tone: "danger" as const, title: "Something went wrong", body: error.message };

  const action =
    error.kind === "pending"
      ? onCheckAgain && { label: busy ? "Checking…" : "Check again", run: onCheckAgain }
      : error.kind !== "unavailable" && onRetry && { label: busy ? "Opening…" : "Try again", run: onRetry };

  return (
    <SheetFrame title={content.title} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="mt-2">
          <ProblemIcon tone={content.tone} />
        </span>
        <span className="font-display text-[24px] font-bold leading-tight md:text-[28px]">{content.title}</span>
        <span className={`text-[13.5px] leading-normal md:text-[14.5px] ${SOFT}`}>{content.body}</span>
        {error.kind === "failed" && error.reason && (
          <span className={`rounded-xl bg-white/5 px-3.5 py-2 text-[12.5px] ${MUTED}`}>PayU: {error.reason}</span>
        )}
        <div className="flex flex-col gap-2.5 self-stretch">
          {action && (
            <button type="button" onClick={action.run} disabled={busy} className={PRIMARY}>
              {action.label}
            </button>
          )}
          <button type="button" onClick={onClose} className={SECONDARY}>
            {error.kind === "cancelled" ? "Not now" : "Close"}
          </button>
        </div>
      </div>
    </SheetFrame>
  );
}
