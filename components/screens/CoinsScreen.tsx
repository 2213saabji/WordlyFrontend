"use client";

import { useState } from "react";
import { CoinIcon } from "@/components/CoinChip";
import { SheetFrame } from "@/components/PaidHint";
import ScreenHeader from "@/components/ScreenHeader";
import { getCoinPacks, getInfiniteTiers, getWalletTransactions } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCoinBalance } from "@/lib/coins";
import { PurchaseError, buyCoinPack, type PurchaseResult } from "@/lib/purchase";
import { formatCoins, formatPaise, hintCostOf } from "@/lib/tiers";
import { useSyncedResource } from "@/lib/use-synced";
import type { CoinPack, CoinTransaction, InfiniteTiersResponse, WalletTransactionsResponse } from "@/types";

const TIERS_CACHE_KEY = "infinite:tiers";
const ACTIVITY_CACHE_KEY = "wallet:transactions";
const PAGE_SIZE = 20;

const MUTED = "text-[#9a8aa2]";
const SOFT = "text-[#c9bfcc]";
const COIN = "text-[#e3b75a]";
const fmt = (n: number) => n.toLocaleString("en-IN");

/** "Today, 08:40", "Yesterday", "24 Sep". */
function activityDate(iso: string, now = Date.now()): string {
  const t = new Date(iso);
  const today = new Date(now);
  if (t.toDateString() === today.toDateString()) {
    return `Today, ${t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (t.toDateString() === new Date(now - 86_400_000).toDateString()) return "Yesterday";
  return t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "gu••@gmail.com" */
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return domain ? `${name.slice(0, 2)}••@${domain}` : email;
}

/** The wallet: balance, the coin pack(s), purchase terms and the ledger.
 * Buying opens Razorpay Checkout (lib/purchase.ts); a credited purchase
 * shows the purchase-done sheet (mobile) / dialog (desktop). */
export default function CoinsScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const balance = useCoinBalance();
  const tiers: InfiniteTiersResponse | null = useSyncedResource({
    flag: "tiers",
    key: TIERS_CACHE_KEY,
    fetcher: getInfiniteTiers,
  }).data;
  const packs = useSyncedResource({ flag: "tiers", key: "store:packs", fetcher: getCoinPacks });
  // First page synced on `wallet` (every balance change); "Load more" pages
  // are fetched on demand and dropped when the first page changes.
  const activityRes = useSyncedResource({
    flag: "wallet",
    key: ACTIVITY_CACHE_KEY,
    fetcher: () => getWalletTransactions({ limit: PAGE_SIZE }),
  });
  const firstPage: WalletTransactionsResponse | null = activityRes.data;
  const [more, setMore] = useState<{ base: WalletTransactionsResponse; next: WalletTransactionsResponse } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const activity = firstPage && more?.base === firstPage ? more.next : firstPage;

  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [done, setDone] = useState<{ pack: CoinPack; result: PurchaseResult } | null>(null);

  // "From Copper (Tier 6) up, a hint costs 1,000 coins."
  const ladder = tiers ? [...tiers.tiers].sort((a, b) => a.tier - b.tier) : [];
  const firstPaid = [...ladder].reverse().find((t) => (hintCostOf(t) ?? 0) > 0);
  const hintCost = firstPaid ? hintCostOf(firstPaid)! : null;
  const freeNames = ladder.filter((t) => hintCostOf(t) === 0).map((t) => t.name);
  const solveReward = tiers?.coins?.solveReward ?? 10;
  const tierName = (tier?: number) => ladder.find((t) => t.tier === tier)?.name;

  async function loadMore() {
    if (!activity?.nextCursor || !firstPage) return;
    setLoadingMore(true);
    try {
      const page = await getWalletTransactions({ cursor: activity.nextCursor, limit: PAGE_SIZE });
      setMore({ base: firstPage, next: { items: [...activity.items, ...page.items], nextCursor: page.nextCursor } });
    } catch {
      // Keep what's shown; the button stays for another try.
    } finally {
      setLoadingMore(false);
    }
  }

  async function buy(pack: CoinPack) {
    setBuying(pack.packId);
    setBuyError(null);
    try {
      const result = await buyCoinPack(pack, { email: user?.email });
      setDone({ pack, result });
    } catch (err) {
      setBuyError(err instanceof PurchaseError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBuying(null);
    }
  }

  const earnLine = (desktop: boolean) =>
    [
      `Earn ${formatCoins(solveReward)} for every word you solve.`,
      firstPaid && hintCost
        ? `From ${firstPaid.name} (Tier ${firstPaid.tier}) up, ${desktop ? "each" : "a"} hint costs ${formatCoins(hintCost)}.`
        : null,
      desktop && freeNames.length > 0 ? `${[...freeNames].reverse().join(" and ")} hints stay free.` : null,
    ]
      .filter(Boolean)
      .join(" ");

  const balanceCard = (desktop: boolean) => (
    <div
      className={`flex flex-col border border-[#e3b75a]/35 bg-[#e3b75a]/8 ${
        desktop ? "gap-[18px] rounded-3xl p-[30px]" : "gap-3 rounded-[22px] p-[22px]"
      }`}
    >
      <span className={`${desktop ? "text-sm" : "text-[12.5px]"} ${SOFT}`}>Balance</span>
      <span className={`flex items-center ${desktop ? "gap-3.5" : "gap-3"}`}>
        <CoinIcon className={desktop ? "size-10" : "size-8"} />
        <span className={`font-display font-bold ${desktop ? "text-5xl" : "text-[36px]"}`}>
          {balance === null ? "—" : fmt(balance)}
        </span>
      </span>
      <span className={`leading-normal ${desktop ? "text-sm leading-[1.55]" : "text-[12.5px]"} ${SOFT}`}>
        {earnLine(desktop)}
      </span>
    </div>
  );

  const packList = (desktop: boolean) => {
    const list = packs.data?.packs ?? [];
    if (list.length === 0) {
      return (
        <span className={`text-[13px] ${MUTED}`}>{packs.failed ? "Coin packs couldn't load right now." : "Loading…"}</span>
      );
    }
    return list.map((pack) => {
      const hints = hintCost ? Math.floor(pack.coins / hintCost) : 0;
      return (
        <div
          key={pack.packId}
          className={`flex items-center border border-white/8 ${
            desktop ? "gap-5 rounded-3xl bg-white/[0.043] px-7 py-[26px]" : "gap-3.5 rounded-[20px] bg-[#1f1725] p-[18px]"
          }`}
        >
          <CoinIcon className={desktop ? "size-11" : "size-[38px] border-[3px]"} />
          <span className={`flex flex-col ${desktop ? "gap-1" : "gap-0.5"}`}>
            <span className={`font-bold ${desktop ? "text-xl" : "text-base"}`}>{formatCoins(pack.coins)}</span>
            {hints > 0 && (
              <span className={`${desktop ? "text-[13.5px]" : "text-xs"} ${MUTED}`}>
                Enough for {hints} hint{hints === 1 ? "" : "s"}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => buy(pack)}
            disabled={buying !== null}
            className={`ml-auto whitespace-nowrap bg-accent font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
              desktop ? "rounded-[14px] px-[26px] py-3.5 text-[15px]" : "rounded-xl px-4 py-[11px] text-sm"
            }`}
          >
            {buying === pack.packId ? "Opening…" : desktop ? `Buy for ${formatPaise(pack.pricePaise)}` : formatPaise(pack.pricePaise)}
          </button>
        </div>
      );
    });
  };

  const terms = (desktop: boolean) => (
    <span className={`leading-normal ${desktop ? "text-[12.5px]" : "text-[11.5px]"} ${MUTED}`}>
      Paid by UPI, card or net banking. Coins have no cash value, can&apos;t be transferred and don&apos;t expire.
    </span>
  );

  const errorLine = buyError && <span className="text-[13px] text-danger">{buyError}</span>;

  function describe(tx: CoinTransaction): { title: string; color: string } {
    const amountColor = tx.amount < 0 ? "text-[#e07a62]" : "text-[#8fc274]";
    switch (tx.type) {
      case "hint_spend": {
        const name = tierName(tx.ref?.tier);
        return { title: name ? `Hint · ${name}` : "Hint", color: amountColor };
      }
      case "earn_solve":
        return { title: tx.ref?.mode === "daily" ? "Solved the Daily word" : "Solved a word", color: amountColor };
      case "purchase":
        return { title: `Bought ${formatCoins(tx.amount)}`, color: COIN };
      case "refund":
        return { title: "Refund", color: amountColor };
      default:
        return { title: "Adjustment", color: amountColor };
    }
  }

  const rows = (desktop: boolean) => {
    if (!activity) {
      return (
        <span className={`py-3 text-[13px] ${desktop ? "px-6" : ""} ${MUTED}`}>
          {activityRes.failed ? "Your coin activity couldn't load right now." : "Loading…"}
        </span>
      );
    }
    if (activity.items.length === 0) {
      return (
        <span className={`py-3 text-[13px] ${desktop ? "px-6" : ""} ${MUTED}`}>
          No activity yet. Solve a word to earn your first coins.
        </span>
      );
    }
    return (
      <>
        {activity.items.map((tx) => {
          const { title, color } = describe(tx);
          return (
            <div
              key={tx.id}
              className={`flex items-center justify-between gap-3 border-b ${
                desktop ? "border-white/6 px-6 py-[15px]" : "border-white/7 py-3"
              }`}
            >
              <span className="flex flex-col gap-0.5">
                <span className={desktop ? "text-[14.5px]" : "text-[13.5px]"}>{title}</span>
                <span className={`${desktop ? "text-[12.5px]" : "text-[11.5px]"} ${MUTED}`}>{activityDate(tx.createdAt)}</span>
              </span>
              <span className={`font-semibold ${desktop ? "text-[15px]" : "text-sm"} ${color}`}>
                {tx.amount < 0 ? `−${fmt(-tx.amount)}` : `+${fmt(tx.amount)}`}
              </span>
            </div>
          );
        })}
        {activity.nextCursor && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className={`py-3 text-[13px] font-semibold text-accent hover:underline disabled:opacity-60 ${desktop ? "px-6 text-left" : ""}`}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-[26px] pt-6 md:gap-8 md:px-8 md:py-14">
      {/* ---------- mobile ---------- */}
      <div className="flex flex-col md:hidden">
        <ScreenHeader title="Coins" onBack={onBack} />
        <div className="mt-[22px]">{balanceCard(false)}</div>
        <div className="mt-3.5 flex flex-col gap-2.5">{packList(false)}</div>
        <div className="mt-2.5 flex flex-col gap-2">
          {terms(false)}
          {errorLine}
        </div>
        <div className="mt-5 flex flex-col">
          <span className="pb-1 text-[11px] font-semibold uppercase tracking-widest text-[#6f6376]">Activity</span>
          {rows(false)}
        </div>
      </div>

      {/* ---------- desktop ---------- */}
      <div className="hidden flex-col gap-3 md:flex">
        <span className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${MUTED}`}>Wallet</span>
        <h1 className="text-[52px] font-light leading-[1.05] tracking-[-0.03em]">Coins</h1>
      </div>
      <div className="hidden grid-cols-2 items-start gap-5 md:grid">
        <div className="flex flex-col gap-5">
          {balanceCard(true)}
          {packList(true)}
          {terms(true)}
          {errorLine}
        </div>
        <div className="flex flex-col overflow-hidden rounded-3xl border border-white/8 bg-white/[0.043]">
          <span className="border-b border-white/8 px-6 py-[18px] text-[15px] font-semibold">Activity</span>
          {rows(true)}
        </div>
      </div>

      {done && (
        <PurchaseDone
          pack={done.pack}
          result={done.result}
          email={user?.email}
          onDone={() => {
            setDone(null);
            onBack();
          }}
          onClose={() => setDone(null)}
        />
      )}
    </div>
  );
}

/** Purchase done: bottom sheet on mobile, dialog on desktop. */
function PurchaseDone({
  pack,
  result,
  email,
  onDone,
  onClose,
}: {
  pack: CoinPack;
  result: PurchaseResult;
  email?: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const coins = result.coinsCredited || pack.coins;
  return (
    <SheetFrame title={`${formatCoins(coins)} added`} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center md:gap-[18px]">
        <CoinIcon className="mt-2 size-[60px] border-4 md:mt-0 md:size-16 md:border-2" />
        <span className="font-display text-[26px] font-bold md:font-sans md:text-[36px] md:font-light md:leading-[1.1] md:tracking-[-0.03em]">
          {formatCoins(coins)} added
        </span>
        <span className={`text-[13.5px] leading-normal md:text-[14.5px] md:leading-[1.55] ${SOFT}`}>
          {formatPaise(pack.pricePaise)} paid. Your balance is now <strong className={COIN}>{formatCoins(result.balance)}</strong>.
        </span>
        <span className={`text-[11.5px] md:text-[12.5px] ${MUTED}`}>
          Order {result.orderId}
          {email ? ` · receipt sent to ${maskEmail(email)}` : ""}
        </span>
        <button
          type="button"
          onClick={onDone}
          className="self-stretch rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] md:rounded-[15px] md:p-[15px] md:text-[15px]"
        >
          Back to the game
        </button>
      </div>
    </SheetFrame>
  );
}
