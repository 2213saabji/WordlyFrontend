"use client";

import { useEffect, useState } from "react";
import { CoinIcon } from "@/components/CoinChip";
import { CustomAmountCard, PurchaseProblemSheet, PurchaseSuccessSheet } from "@/components/CoinPurchase";
import ScreenHeader from "@/components/ScreenHeader";
import { getCoinPacks, getInfiniteTiers, getWalletTransactions } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCoinBalance } from "@/lib/coins";
import {
  PURCHASES_CLOSED_COPY,
  PURCHASES_OPEN,
  PurchaseError,
  buyCoins,
  finishReturnedPurchase,
  type PurchaseResult,
  type ReturnedPurchaseHint,
} from "@/lib/purchase";
import { formatCoins, formatPaise, hintCostOf } from "@/lib/tiers";
import { useSyncedResource } from "@/lib/use-synced";
import type { CoinPack, CoinPurchase, CoinTransaction, InfiniteTiersResponse, WalletTransactionsResponse } from "@/types";

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

/** The wallet: balance, the coin pack(s), a custom amount, purchase terms
 * and the ledger. Buying goes to PayU's checkout (lib/purchase.ts); while
 * purchases are closed, a "coming soon" line replaces the packs and terms.
 * `returned`: just back from PayU with this order — a credited purchase
 * shows the purchase-done celebration, anything else the problem sheet
 * (bottom sheets on mobile, dialogs on desktop). */
export default function CoinsScreen({
  onBack,
  returned,
}: {
  onBack: () => void;
  returned?: { orderId: string; hint: ReturnedPurchaseHint };
}) {
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

  // The pack id (or "custom") whose purchase is starting.
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [done, setDone] = useState<{ pack: CoinPack; result: PurchaseResult } | null>(null);
  const [problem, setProblem] = useState<PurchaseError | null>(null);
  const [checking, setChecking] = useState(!!returned);

  // Back from PayU: wait for the order's outcome (`checking` is already on).
  // "Check again" on a payment still being confirmed runs it once more.
  function settle(orderId: string, hint: ReturnedPurchaseHint, isCancelled: () => boolean = () => false) {
    return finishReturnedPurchase(orderId, hint)
      .then(({ result, pack }) => {
        if (isCancelled()) return;
        setProblem(null);
        setDone({ pack, result });
      })
      .catch((err: unknown) => {
        if (!isCancelled()) setProblem(err instanceof PurchaseError ? err : new PurchaseError("error"));
      })
      .finally(() => {
        if (!isCancelled()) setChecking(false);
      });
  }

  useEffect(() => {
    if (!returned) return;
    let cancelled = false;
    void settle(returned.orderId, returned.hint, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [returned]);

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

  // Goes to PayU; only comes back here if it couldn't start or the player
  // pressed Back on PayU's page. The outcome arrives as `returned`.
  async function buy(item: CoinPurchase) {
    setBuying("packId" in item ? item.packId : "custom");
    setBuyError(null);
    try {
      await buyCoins(item);
    } catch (err) {
      const e = err instanceof PurchaseError ? err : new PurchaseError("error", { retry: item });
      // Not open yet / couldn't start: a line under the packs. Back from
      // PayU's page without paying: the cancelled sheet, with Try again.
      if (e.kind === "cancelled") {
        setDone(null);
        setProblem(e);
      } else {
        setBuyError(e.message);
      }
      setBuying(null);
    }
  }

  const retry = problem?.retry;
  const retryPurchase = retry
    ? () => {
        setProblem(null);
        void buy(retry);
      }
    : undefined;

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
    if (!PURCHASES_OPEN) {
      return <span className={`${desktop ? "text-sm" : "text-[13px]"} ${SOFT}`}>{PURCHASES_CLOSED_COPY}</span>;
    }
    const list = packs.data?.packs ?? [];
    if (list.length === 0) {
      return (
        <span className={`text-[13px] ${MUTED}`}>{packs.failed ? "Coin packs couldn't load right now." : "Loading…"}</span>
      );
    }
    const custom = packs.data?.custom;
    const cards = list.map((pack) => {
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
            onClick={() => buy({ packId: pack.packId })}
            disabled={buying !== null || checking}
            className={`ml-auto whitespace-nowrap bg-accent font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${
              desktop ? "rounded-[14px] px-[26px] py-3.5 text-[15px]" : "rounded-xl px-4 py-[11px] text-sm"
            }`}
          >
            {buying === pack.packId ? "Opening…" : desktop ? `Buy for ${formatPaise(pack.pricePaise)}` : formatPaise(pack.pricePaise)}
          </button>
        </div>
      );
    });
    if (!custom) return cards;
    return [
      ...cards,
      <CustomAmountCard
        key="custom"
        rules={custom}
        hintCost={hintCost}
        buying={buying === "custom"}
        disabled={buying !== null || checking}
        onBuy={(amountPaise) => buy({ amountPaise })}
        variant={desktop ? "desktop" : "mobile"}
      />,
    ];
  };

  const terms = (desktop: boolean) =>
    PURCHASES_OPEN && (
      <span className={`leading-normal ${desktop ? "text-[12.5px]" : "text-[11.5px]"} ${MUTED}`}>
        Paid by UPI, card or net banking. Coins have no cash value, can&apos;t be transferred and don&apos;t expire.
      </span>
    );

  const errorLine = checking ? (
    <span className={`text-[13px] ${SOFT}`}>Checking your payment…</span>
  ) : (
    buyError && <span className="text-[13px] text-danger">{buyError}</span>
  );

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
        <PurchaseSuccessSheet
          coins={done.result.coinsCredited || done.pack.coins}
          pricePaise={done.pack.pricePaise}
          balance={done.result.balance}
          orderId={done.result.orderId}
          email={user?.email}
          hintCost={hintCost}
          onDone={() => {
            setDone(null);
            onBack();
          }}
          onClose={() => setDone(null)}
        />
      )}
      {problem && !done && (
        <PurchaseProblemSheet
          error={problem}
          busy={checking || buying !== null}
          onRetry={retryPurchase}
          onCheckAgain={
            returned
              ? () => {
                  setChecking(true);
                  void settle(returned.orderId, "check");
                }
              : undefined
          }
          onClose={() => setProblem(null)}
        />
      )}
    </div>
  );
}
