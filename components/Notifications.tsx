"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import { getInfiniteTiers, getNotifications, markNotificationsRead } from "@/lib/api";
import { readCache, writeCache } from "@/lib/cache";
import { MONEY_ENABLED } from "@/lib/flags";
import type { Screen } from "@/lib/screen-context";
import { formatInr } from "@/lib/tiers";
import {
  MONEY_NOTIFICATION_TYPES,
  type AppNotification,
  type InfiniteTiersResponse,
  type TierNumber,
} from "@/types";

// Mount only with INFINITE_TIERS_ENABLED — every type here is a tier event.

const TIERS_CACHE_KEY = "infinite:tiers";
const NOTIFICATIONS_CACHE_KEY = "infinite:notifications";

const MUTED = "text-[#6f6376]";
const SOFT = "text-[#c9bfcc]";
const DIAMOND = "#9fd4e6";

/** The feed plus read-state actions. Money-only types are dropped when
 * MONEY_ENABLED is off; refreshes on mount and whenever the tab regains
 * focus, which is enough for events that happen at most daily. */
export function useNotifications() {
  const [items, setItems] = useState<AppNotification[] | null>(() =>
    readCache<AppNotification[]>(NOTIFICATIONS_CACHE_KEY),
  );

  const refresh = useCallback(() => {
    getNotifications()
      .then(({ notifications }) => {
        const visible = MONEY_ENABLED
          ? notifications
          : notifications.filter((n) => !MONEY_NOTIFICATION_TYPES.includes(n.type));
        writeCache(NOTIFICATIONS_CACHE_KEY, visible);
        setItems(visible);
      })
      .catch(() => setItems((prev) => prev ?? []));
  }, []);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const markRead = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    // Optimistic — a failed call just leaves them unread next refresh.
    setItems((prev) => prev?.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)) ?? prev);
    markNotificationsRead(ids).catch(() => {});
  }, []);

  const unread = (items ?? []).filter((n) => !n.read);
  const markAllRead = useCallback(() => markRead(unread.map((n) => n.id)), [markRead, unread]);

  return { items, unreadCount: unread.length, markRead, markAllRead, refresh };
}

function useTiers(): InfiniteTiersResponse | null {
  const [tiers, setTiers] = useState(() => readCache<InfiniteTiersResponse>(TIERS_CACHE_KEY));
  useEffect(() => {
    getInfiniteTiers()
      .then((res) => {
        writeCache(TIERS_CACHE_KEY, res);
        setTiers(res);
      })
      .catch(() => {});
  }, []);
  return tiers;
}

// ---------------------------------------------------------------------------
// Row content per type. `data` fields beyond { fromTier, toTier, oldRank,
// rankAtEntry } are ASSUMED (the contract only gives that example) — each
// line degrades to a shorter sentence when a field is missing.

interface Row {
  icon: string;
  iconBg: string;
  title: string;
  body: string;
  target?: Screen;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function describe(n: AppNotification, tiers: InfiniteTiersResponse | null): Row | null {
  const d = n.data;
  const tierName = (t: number | undefined) => (t ? (tiers?.tiers.find((x) => x.tier === t)?.name ?? `Tier ${t}`) : "");
  const top = tiers?.tiers.find((t) => t.tier === 1);
  const topName = top?.name ?? "Diamond";
  const reward = top && top.rewardInr > 0 ? formatInr(top.rewardInr) : null;
  const cycleDays = top?.daysToStick ?? 30;
  const amount = num(d.amountInr) !== undefined ? formatInr(num(d.amountInr)!) : (reward ?? "Your reward");
  const cycle = num(d.cycle);

  switch (n.type) {
    case "promotion": {
      const to = d.toTier as TierNumber | undefined;
      if (to === 1) {
        return {
          icon: "1",
          iconBg: DIAMOND,
          title: `You reached ${topName}`,
          body:
            MONEY_ENABLED && reward
              ? `Stay ${cycleDays} days in a row to earn ${reward}.`
              : `Stay ${cycleDays} days in a row to earn a ${topName} star.`,
          target: { name: "diamond" },
        };
      }
      const toDef = tiers?.tiers.find((t) => t.tier === to);
      const moved =
        d.oldRank != null && d.rankAtEntry != null
          ? `#${d.oldRank} in ${tierName(d.fromTier)} to #${d.rankAtEntry} in ${tierName(to)}. `
          : "";
      return {
        icon: "↑",
        iconBg: "#8fc274",
        title: `Moved up to ${tierName(to)}`,
        body: `${moved}Day count reset to 0${toDef ? ` of ${toDef.daysToStick}` : ""}.`,
        target: { name: "tier-leaderboard", tier: to },
      };
    }
    case "demotion": {
      const to = d.toTier as TierNumber | undefined;
      const size = num(d.newTierSize);
      const misses = tiers?.demotion;
      return {
        icon: "↓",
        iconBg: "#b5543f",
        title: `Moved down to ${tierName(to)}`,
        body: [
          misses ? `${misses.misses} missed days in ${misses.windowDays}.` : null,
          d.rankAtEntry != null ? `You're #${d.rankAtEntry}${size ? ` of ${size}` : ""}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
        target: { name: "infinite-hub" },
      };
    }
    case "demotion_risk": {
      const misses = num(d.missesInWindow) ?? (tiers ? tiers.demotion.misses - 1 : 2);
      return {
        icon: "!",
        iconBg: "#f2a05c",
        title: `${misses} misses this week`,
        body: `Qualify today to stay in ${tierName(num(d.tier)) || "your tier"}.`,
        target: { name: "infinite-hub" },
      };
    }
    case "reward_earned":
      return MONEY_ENABLED
        ? {
            icon: "★",
            iconBg: DIAMOND,
            title: "Cycle complete",
            body: `${cycleDays} days in ${topName}. ${amount} is on its way.`,
            target: { name: "diamond" },
          }
        : {
            icon: "★",
            iconBg: DIAMOND,
            title: `${topName} star earned`,
            body: `${cycleDays} days in a row in ${topName}.`,
            target: { name: "diamond" },
          };
    case "payout_sent": {
      const last4 = str(d.accountLast4);
      return {
        icon: "₹",
        iconBg: DIAMOND,
        title: `${amount} sent`,
        body: `${cycle ? `Cycle ${cycle} payout` : "Your payout"} reached your account${last4 ? ` ending ${last4}` : ""}.`,
        target: { name: "diamond" },
      };
    }
    case "payout_failed":
      return {
        icon: "!",
        iconBg: "#e8636b",
        title: "Payout failed",
        body: `${cycle ? `Cycle ${cycle} payout` : "Your payout"} couldn't be sent. Check your bank details.`,
        target: { name: "verify", step: "bank" },
      };
    case "verification_needed":
      return {
        icon: "1",
        iconBg: DIAMOND,
        title: `You reached ${topName}`,
        body: `Verify your mobile, email and bank to receive ${reward ?? "your reward"}.`,
        target: { name: "verify" },
      };
    default:
      return null;
  }
}

/** "12 min ago", "2 h ago", "Today, 00:01", "Yesterday", "9 Aug". */
function timeLabel(iso: string, now = Date.now()): string {
  const t = new Date(iso);
  const mins = Math.floor((now - t.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 6 * 60) return `${Math.floor(mins / 60)} h ago`;
  const today = new Date(now);
  const sameDay = t.toDateString() === today.toDateString();
  if (sameDay) return `Today, ${t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  const yesterday = new Date(now - 86_400_000);
  if (t.toDateString() === yesterday.toDateString()) return "Yesterday";
  return t.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function NotificationsList({
  items,
  compact,
  onOpen,
}: {
  items: AppNotification[];
  compact: boolean;
  onOpen: (n: AppNotification, target?: Screen) => void;
}) {
  const tiers = useTiers();
  const rows = items
    .map((n) => ({ n, row: describe(n, tiers) }))
    .filter((x): x is { n: AppNotification; row: Row } => x.row !== null);

  if (rows.length === 0) {
    return <p className={`px-[22px] py-8 text-center text-sm ${SOFT}`}>No notifications yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {rows.map(({ n, row }) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onOpen(n, row.target)}
          className={`flex gap-3.5 border-b text-left transition-colors hover:bg-white/3 ${
            compact ? "border-white/6 px-[22px] py-[15px]" : "border-white/7 py-4"
          }`}
        >
          <span
            style={{ backgroundColor: row.iconBg }}
            className={`flex flex-none items-center justify-center font-display font-bold text-background ${
              compact ? "size-[34px] rounded-[10px] text-sm" : "size-9 rounded-[11px] text-[15px]"
            }`}
          >
            {row.icon}
          </span>
          <span className="flex min-w-0 flex-col gap-[3px]">
            <span className="text-sm font-semibold">{row.title}</span>
            {row.body && <span className={`text-[12.5px] leading-[1.45] ${SOFT}`}>{row.body}</span>}
            <span className={`text-[11.5px] ${MUTED}`}>{timeLabel(n.createdAt)}</span>
          </span>
          <span
            aria-label={n.read ? undefined : "Unread"}
            className={`ml-auto mt-1.5 size-2 flex-none rounded-full ${n.read ? "bg-transparent" : "bg-accent"}`}
          />
        </button>
      ))}
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-4">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/** Nav bell. Desktop: toggles the 420px dropdown panel. Mobile: calls
 * `onOpenScreen` (the full-screen list) instead. */
export function NotificationBell({
  onNavigate,
  onOpenScreen,
}: {
  onNavigate: (target: Screen) => void;
  onOpenScreen: () => void;
}) {
  const { items, unreadCount, markRead, markAllRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (window.matchMedia("(min-width: 768px)").matches) {
      if (!open) refresh();
      setOpen((o) => !o);
    } else {
      onOpenScreen();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex size-8 items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:border-accent/40 hover:text-accent md:size-9 md:rounded-[10px]"
      >
        <BellIcon />
        {unreadCount > 0 && <span className="absolute right-2 top-[7px] size-[7px] rounded-full bg-accent" />}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-30 flex max-h-[70vh] w-105 animate-fade-in-up flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#1f1725] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-white/7 px-[22px] py-[18px]">
            <span className="text-[15.5px] font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead} className={`text-[13px] ${SOFT} hover:text-foreground`}>
                Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto">
            {items === null ? (
              <Loader label="Loading…" />
            ) : (
              <NotificationsList
                items={items}
                compact
                onOpen={(n, target) => {
                  if (!n.read) markRead([n.id]);
                  setOpen(false);
                  if (target) onNavigate(target);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile: the full-screen notification list. */
export function NotificationsScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (target: Screen) => void;
}) {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-6 pt-6">
      <ScreenHeader
        title="Notifications"
        onBack={onBack}
        trailing={
          unreadCount > 0 && (
            <button type="button" onClick={markAllRead} className={`text-[13px] ${SOFT} hover:text-foreground`}>
              Mark all read
            </button>
          )
        }
      />
      <div className="mt-2">
        {items === null ? (
          <Loader label="Loading…" />
        ) : (
          <NotificationsList
            items={items}
            compact={false}
            onOpen={(n, target) => {
              if (!n.read) markRead([n.id]);
              if (target) onNavigate(target);
            }}
          />
        )}
      </div>
    </div>
  );
}
