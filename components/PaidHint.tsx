"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CoinIcon } from "@/components/CoinChip";
import { ApiRequestError, getCoinPacks, revealInfiniteHint } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { setCoinBalance, useCoinBalance } from "@/lib/coins";
import { PurchaseError, buyCoinPack, type PurchaseResult } from "@/lib/purchase";
import { invalidate } from "@/lib/sync";
import { formatCoins, formatPaise } from "@/lib/tiers";
import { useSyncedResource } from "@/lib/use-synced";
import type { CoinPack } from "@/types";

// Paid hints (Tiers 1–6, contract v0.4 §3.3 / §5.4): the "Need a hint?" row
// (mobile) / card (desktop), the confirm sheet and the not-enough-coins
// sheet. The hint is the word's clue; buying it unlocks it for this round
// only. Coins are only deducted on confirm, server-side, in one transaction
// with the reveal.

const MUTED = "text-[#9a8aa2]";
const SOFT = "text-[#c9bfcc]";
const COIN = "text-[#e3b75a]";
const COIN_BUTTON =
  "flex items-center justify-center gap-2 whitespace-nowrap border border-[#e3b75a]/45 bg-[#e3b75a]/14 font-bold text-[#e3b75a] transition-colors hover:bg-[#e3b75a]/22 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#e3b75a]/14";
const fmt = (n: number) => n.toLocaleString("en-IN");

type Sheet =
  | { kind: "confirm"; cost: number }
  /** short: the hint costs more than the balance · get: "Get coins" link. */
  | { kind: "coins"; reason: "short" | "get"; cost: number };

/** State + actions for one round's paid hint. `onRevealed` gets the clue. */
export function usePaidHint({
  gameId,
  hintCost,
  onRevealed,
  onHintsOff,
}: {
  gameId?: string;
  hintCost: number;
  onRevealed: (hint: string) => void;
  /** 403 HINTS_DISABLED_FOR_TIER — show the hints-off notice instead. */
  onHintsOff: () => void;
}) {
  const balance = useCoinBalance();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Both are per round, so they're stored with the round's id and ignored
  // once the next round starts.
  // 409 NOTHING_TO_REVEAL: this word has no clue — hide the row.
  const [noClueFor, setNoClueFor] = useState<string | undefined>(undefined);
  // A price change reported by the server (409 HINT_COST_CHANGED).
  const [override, setOverride] = useState<{ gameId?: string; cost: number } | null>(null);
  const noClue = noClueFor !== undefined && noClueFor === gameId;
  const cost = override && override.gameId === gameId ? override.cost : hintCost;

  function open() {
    setMessage(null);
    setSheet(balance !== null && balance < cost ? { kind: "coins", reason: "short", cost } : { kind: "confirm", cost });
  }

  function openGetCoins() {
    setMessage(null);
    setSheet({ kind: "coins", reason: "get", cost });
  }

  async function confirm() {
    if (!sheet || sheet.kind !== "confirm") return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await revealInfiniteHint({ gameId, expectedCost: sheet.cost });
      setCoinBalance(res.balance);
      invalidate("wallet", "me");
      setSheet(null);
      onRevealed(res.hint);
    } catch (err) {
      const data = err instanceof ApiRequestError ? err.data : null;
      switch (data?.code) {
        case "INSUFFICIENT_COINS":
          if (data.balance !== undefined) setCoinBalance(data.balance);
          setSheet({ kind: "coins", reason: "short", cost: data.required ?? sheet.cost });
          break;
        case "HINT_COST_CHANGED":
          if (data.balance !== undefined) setCoinBalance(data.balance);
          if (typeof data.hintCost === "number" && data.hintCost > 0) {
            setOverride({ gameId, cost: data.hintCost });
            setSheet({ kind: "confirm", cost: data.hintCost });
            setMessage(`The hint price is now ${formatCoins(data.hintCost)}.`);
          } else {
            setSheet(null);
            onHintsOff();
          }
          break;
        case "NOTHING_TO_REVEAL":
          setSheet(null);
          setNoClueFor(gameId);
          break;
        case "HINTS_DISABLED_FOR_TIER":
          setSheet(null);
          onHintsOff();
          break;
        default:
          setMessage(err instanceof ApiRequestError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  /** After a purchase from the hint flow, go back to the confirm sheet. */
  function purchased() {
    setSheet((s) => (s?.kind === "coins" && s.reason === "short" ? { kind: "confirm", cost: s.cost } : null));
  }

  return { balance, cost, noClue, sheet, busy, message, open, openGetCoins, confirm, purchased, close: () => setSheet(null) };
}

export type PaidHintState = ReturnType<typeof usePaidHint>;

/** Mobile: the row between the board and the keyboard. Once bought, the
 * button is replaced by the clue. */
export function PaidHintRow({
  hint,
  unlocked,
  unlockAfter,
  state,
}: {
  hint?: string;
  unlocked: boolean;
  unlockAfter: number;
  state: PaidHintState;
}) {
  if (hint) {
    return (
      <div className="flex animate-fade-in flex-col gap-0.5 rounded-[14px] border border-[#e3b75a]/30 bg-[#e3b75a]/8 px-4 py-2.5">
        <span className={`text-[11.5px] font-semibold ${COIN}`}>Hint</span>
        <span className="text-[13.5px] leading-snug">{hint}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-[#1f1725] py-2.5 pl-4 pr-2.5">
      <span className="flex flex-col gap-0.5">
        <span className="text-[13.5px] font-semibold">Need a hint?</span>
        <span className={`text-[11.5px] ${MUTED}`}>
          {unlocked ? `Unlocked after guess ${unlockAfter}` : `Unlocks after guess ${unlockAfter}`}
        </span>
      </span>
      <button
        type="button"
        onClick={state.open}
        disabled={!unlocked}
        aria-label={`Unlock hint for ${formatCoins(state.cost)}`}
        className={`ml-auto rounded-xl px-3.5 py-2.5 text-[13.5px] ${COIN_BUTTON}`}
      >
        <CoinIcon className="size-[15px]" />
        {fmt(state.cost)}
      </button>
    </div>
  );
}

/** Desktop: the right-hand panel card. */
export function PaidHintCard({
  hint,
  unlocked,
  unlockAfter,
  fromName,
  state,
}: {
  hint?: string;
  unlocked: boolean;
  unlockAfter: number;
  /** The lowest paid tier, for "Copper and up". */
  fromName?: string;
  state: PaidHintState;
}) {
  return (
    <div className="flex flex-col gap-3.5 rounded-[22px] border border-white/8 bg-white/4.5 p-5.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">{hint ? "Hint" : "Need a hint?"}</span>
        {fromName && <span className={`whitespace-nowrap text-[12.5px] ${MUTED}`}>{fromName} and up</span>}
      </div>
      {hint ? (
        <span className="animate-fade-in rounded-[14px] border border-[#e3b75a]/30 bg-[#e3b75a]/8 px-4 py-3 text-[14px] leading-normal">
          {hint}
        </span>
      ) : (
        <>
          <span className={`text-[13.5px] leading-normal ${SOFT}`}>
            Available after guess {unlockAfter}. Unlocks this word&apos;s clue until the game ends.
          </span>
          <button
            type="button"
            onClick={state.open}
            disabled={!unlocked}
            className={`rounded-[14px] p-3.5 text-[14.5px] ${COIN_BUTTON}`}
          >
            <CoinIcon />
            Unlock hint · {fmt(state.cost)}
          </button>
          {state.balance !== null && (
            <span className={`text-[12.5px] ${MUTED}`}>
              You have {fmt(state.balance)} coins.{" "}
              <button type="button" onClick={state.openGetCoins} className="text-accent hover:underline">
                Get coins
              </button>
            </span>
          )}
        </>
      )}
    </div>
  );
}

/** Bottom sheet on mobile, centred dialog on desktop. */
export function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center"
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 animate-fade-in bg-[#09060b]/60" />
      <div className="relative flex animate-fade-in-up flex-col gap-[18px] rounded-t-[30px] border-t border-white/10 bg-[#1f1725] px-[22px] pb-[26px] pt-3.5 md:w-110 md:rounded-[24px] md:border md:p-7 md:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
        <span aria-hidden className="h-1 w-11 self-center rounded-[3px] bg-white/18 md:hidden" />
        {children}
      </div>
    </div>
  );
}

const SECONDARY =
  "rounded-2xl border border-white/12 bg-white/7 p-[15px] text-[14.5px] font-semibold transition-colors hover:border-accent/40 md:rounded-[14px] md:p-3";

/** Renders whichever sheet the hint flow has open (or nothing). */
export function PaidHintSheets({ state, tierName }: { state: PaidHintState; tierName?: string }) {
  const { sheet } = state;
  if (!sheet) return null;
  if (sheet.kind === "confirm") return <ConfirmHintSheet state={state} cost={sheet.cost} tierName={tierName} />;
  return (
    <CoinPackSheet
      title={sheet.reason === "short" ? "Not enough coins" : "Get coins"}
      intro={
        sheet.reason === "short"
          ? `A hint costs ${formatCoins(sheet.cost)}${state.balance !== null ? ` and you have ${fmt(state.balance)}` : ""}.`
          : state.balance !== null
            ? `You have ${formatCoins(state.balance)}.`
            : undefined
      }
      onClose={state.close}
      onPurchased={state.purchased}
    />
  );
}

function ConfirmHintSheet({ state, cost, tierName }: { state: PaidHintState; cost: number; tierName?: string }) {
  return (
    <SheetFrame title="Use a hint?" onClose={state.close}>
      <span className="flex flex-col gap-2">
        <span className="font-display text-2xl font-bold">Use a hint?</span>
        <span className={`text-[13.5px] leading-normal ${SOFT}`}>
          Shows the hint for this word. It stays open until the game ends.
          {tierName ? ` Hints in ${tierName} cost ${formatCoins(cost)}.` : ""}
        </span>
      </span>
      <div className="flex flex-col rounded-2xl bg-white/4 text-[13.5px]">
        <div className="flex justify-between gap-3 border-b border-white/7 px-4 py-[13px]">
          <span className={`whitespace-nowrap ${MUTED}`}>Cost</span>
          <span className={`whitespace-nowrap font-semibold ${COIN}`}>{formatCoins(cost)}</span>
        </div>
        {state.balance !== null && (
          <div className="flex justify-between gap-3 px-4 py-[13px]">
            <span className={`whitespace-nowrap ${MUTED}`}>Balance after</span>
            <span className="whitespace-nowrap">
              <span className={MUTED}>{fmt(state.balance)} → </span>
              <strong>{fmt(Math.max(0, state.balance - cost))}</strong>
            </span>
          </div>
        )}
      </div>
      {state.message && <span className="text-[13px] text-danger">{state.message}</span>}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={state.close}
          className="rounded-2xl border border-white/12 bg-white/7 px-5 py-4 text-[14.5px] font-semibold transition-colors hover:border-accent/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={state.confirm}
          disabled={state.busy}
          className="flex-1 rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          {state.busy ? "Unlocking…" : `Unlock hint · ${fmt(cost)}`}
        </button>
      </div>
    </SheetFrame>
  );
}

/** The coin packs (one at launch: 3,000 coins for ₹10) with Buy buttons. */
export function CoinPackSheet({
  title,
  intro,
  onClose,
  onPurchased,
}: {
  title: string;
  intro?: string;
  onClose: () => void;
  onPurchased: (result: PurchaseResult) => void;
}) {
  const { user } = useAuth();
  // Packs are TierConfig values, so they change with the `tiers` flag.
  const packs = useSyncedResource({ flag: "tiers", key: "store:packs", fetcher: getCoinPacks });
  const [buying, setBuying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function buy(pack: CoinPack) {
    setBuying(pack.packId);
    setMessage(null);
    try {
      const result = await buyCoinPack(pack, { email: user?.email });
      onPurchased(result);
    } catch (err) {
      setMessage(err instanceof PurchaseError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBuying(null);
    }
  }

  const list = packs.data?.packs ?? [];
  return (
    <SheetFrame title={title} onClose={onClose}>
      <span className="font-display text-[22px] font-bold leading-tight md:font-sans md:text-[24px] md:font-semibold">{title}</span>
      {intro && <span className={`text-[13.5px] leading-normal ${SOFT}`}>{intro}</span>}
      {list.length === 0 ? (
        <span className={`text-[13px] ${MUTED}`}>{packs.failed ? "Coin packs couldn't load right now." : "Loading…"}</span>
      ) : (
        list.map((pack) => (
          <div
            key={pack.packId}
            className="flex items-center gap-3 rounded-2xl border border-[#e3b75a]/35 bg-[#e3b75a]/8 py-3 pl-4 pr-3"
          >
            <CoinIcon className="size-6" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold">{formatCoins(pack.coins)}</span>
              <span className={`text-[12px] ${MUTED}`}>Incl. GST</span>
            </span>
            <button
              type="button"
              onClick={() => buy(pack)}
              disabled={buying !== null}
              className="ml-auto rounded-xl bg-accent px-4 py-2.5 text-[14px] font-bold text-background transition-all hover:shadow-lg hover:shadow-accent/25 disabled:opacity-60"
            >
              {buying === pack.packId ? "Opening…" : `Buy for ${formatPaise(pack.pricePaise)}`}
            </button>
          </div>
        ))
      )}
      {message && <span className="text-[13px] text-danger">{message}</span>}
      <span className={`text-[11.5px] leading-normal ${MUTED}`}>
        Coins have no cash value, can&apos;t be withdrawn or transferred, and don&apos;t expire. Purchases are
        non-refundable.
      </span>
      <button type="button" onClick={onClose} className={SECONDARY}>
        Not now
      </button>
    </SheetFrame>
  );
}
