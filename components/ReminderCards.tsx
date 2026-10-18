"use client";

import { useEffect, useState } from "react";
import { getInfiniteMe, getInfiniteTiers, getReminders, updateReminders } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  DEFAULT_REMINDER_TIME,
  REMINDER_TIMES,
  clockLabel,
  enableReminders,
  reminderJustSet,
} from "@/lib/reminders";
import { plural } from "@/lib/tiers";
import { useSyncedResource } from "@/lib/use-synced";
import type { InfiniteMeResponse, InfiniteTiersResponse, ReminderSettings, ReminderTime } from "@/types";

// The home screen's one extra card, under the play buttons:
//   1. "Reminder set" — for the rest of the visit after turning reminders on
//   2. "Get a daily reminder" — until the player answers it (once per account)
//   3. "You haven't played today" — an Infinite player with nothing played
//      in today's Infinite day
// Only one shows at a time.

const ME_CACHE_KEY = "infinite:me"; // shared with the Infinite screens
const TIERS_CACHE_KEY = "infinite:tiers";

const CARD = "rounded-[22px] border bg-[#1f1725] p-5";
const SOFT = "text-[#c9bfcc]";
const MUTED = "text-[#9a8aa2]";
const GOLD = "#e3b75a";
const GREEN = "#8fc274";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="size-4.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Morning / Evening / Night. Also used on the Settings screen. */
export function ReminderTimePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ReminderTime;
  onChange: (time: ReminderTime) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Reminder time" className="grid grid-cols-3 gap-2">
      {REMINDER_TIMES.map((option) => {
        const selected = option.time === value;
        return (
          <button
            key={option.time}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.time)}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-2.5 transition-colors duration-150 disabled:opacity-60 ${
              selected ? "border-[1.5px] border-accent bg-accent/14" : "border border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <span className={`text-sm font-semibold ${selected ? "text-accent" : ""}`}>{option.clock}</span>
            <span className={`text-[11px] ${selected ? SOFT : MUTED}`}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReminderPrompt({ onDone }: { onDone: () => void }) {
  const { applyReminders } = useAuth();
  const [time, setTime] = useState<ReminderTime>(DEFAULT_REMINDER_TIME);
  const [known, setKnown] = useState<ReminderSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whether the server can send push decides what "Remind me" does, and the
  // tap must reach the permission prompt without waiting on the network.
  useEffect(() => {
    let cancelled = false;
    getReminders()
      .then((s) => !cancelled && setKnown(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const remind = () => {
    setBusy(true);
    setError(null);
    enableReminders(time, known)
      .then(({ settings }) => {
        applyReminders(settings);
        onDone();
      })
      .catch(() => {
        setError("Couldn't set the reminder. Try again.");
        setBusy(false);
      });
  };

  const notNow = () => {
    setBusy(true);
    updateReminders({ promptAnswered: true })
      .then((settings) => applyReminders(settings))
      .catch(() => {})
      .finally(onDone);
  };

  return (
    <div className={`${CARD} flex animate-fade-in-up flex-col gap-4 border-accent/40`}>
      <div className="flex items-start gap-3.5">
        <span className="flex size-10 flex-none items-center justify-center rounded-[13px] bg-accent/15 text-accent">
          <BellIcon />
        </span>
        <span className="flex flex-col gap-1">
          <span className="text-[15.5px] font-semibold">Get a daily reminder</span>
          <span className={`text-[13px] leading-normal ${SOFT}`}>
            One notification a day when a new word is ready. Nothing else.
          </span>
        </span>
      </div>
      <ReminderTimePicker value={time} onChange={setTime} disabled={busy} />
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={notNow}
          disabled={busy}
          className={`rounded-[14px] px-[18px] py-3.5 text-sm font-semibold ${SOFT} transition-colors hover:text-foreground disabled:opacity-60`}
        >
          Not now
        </button>
        <button
          type="button"
          onClick={remind}
          disabled={busy}
          className="flex-1 rounded-[14px] bg-accent p-3.5 text-[14.5px] font-bold text-background transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-70"
        >
          {busy ? "Setting…" : `Remind me at ${clockLabel(time)}`}
        </button>
      </div>
    </div>
  );
}

function ReminderSetCard({ time, byEmail, onChange }: { time: ReminderTime; byEmail: boolean; onChange: () => void }) {
  return (
    <div className={`flex animate-fade-in-up items-center gap-3.5 rounded-[20px] border bg-[#1f1725] px-[18px] py-4`} style={{ borderColor: "rgba(143,194,116,0.35)" }}>
      <span
        className="flex size-9 flex-none items-center justify-center rounded-xl"
        style={{ background: "rgba(143,194,116,0.15)", color: GREEN }}
      >
        <CheckIcon />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold">
          Reminder set for {clockLabel(time)}
          {byEmail && " by email"}
        </span>
        <span className={`text-[12.5px] ${MUTED}`}>Change it any time in Settings</span>
      </span>
      <button type="button" onClick={onChange} className="ml-auto text-[13px] font-semibold text-accent hover:underline">
        Change
      </button>
    </div>
  );
}

function timeLeft(resetsAt: string, now: number): string {
  const ms = Math.max(0, new Date(resetsAt).getTime() - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

function InfiniteNudge({ me, tiers, onPlay }: { me: InfiniteMeResponse; tiers: InfiniteTiersResponse | null; onPlay: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { targetGames, gamesCompleted } = me.today;
  const decayPercent = tiers ? Math.round(tiers.decay.rate * 100) : null;
  const segments = Math.min(Math.max(targetGames, 1), 10);

  return (
    <div className={`${CARD} flex animate-fade-in-up flex-col gap-3.5`} style={{ borderColor: "rgba(227,183,90,0.4)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15.5px] font-semibold">You haven&apos;t played today</span>
        <span className="whitespace-nowrap text-[12.5px]" style={{ color: GOLD }}>
          {timeLeft(me.today.resetsAt, now)}
        </span>
      </div>
      <span className={`text-[13px] leading-normal ${SOFT}`}>
        Play {plural(targetGames, "Infinite word")} before the day resets to keep your {me.tierName} day count.
        {me.score > 0 && decayPercent ? ` Skipping the day takes ${decayPercent}% off your points.` : ""}
      </span>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className="h-1.5 flex-1 rounded-[3px]" style={{ background: i < gamesCompleted ? GOLD : "rgba(255,255,255,0.1)" }} />
        ))}
      </div>
      <button
        type="button"
        onClick={onPlay}
        className="rounded-[14px] bg-accent p-3.5 text-center text-[14.5px] font-bold text-background transition-transform duration-150 hover:-translate-y-0.5"
      >
        Play now
      </button>
    </div>
  );
}

/** Right after signing up or logging in, while reminders are off: the same
 * card as on the home screen, as a popup (bottom sheet on phones). Tapping
 * outside closes it for now without answering. */
export function ReminderPopup({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-[rgba(9,6,11,0.6)] px-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:items-center md:p-6"
    >
      <div role="dialog" aria-modal="true" aria-label="Daily reminder" onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <ReminderPrompt onDone={onClose} />
      </div>
    </div>
  );
}

export function HomeReminderSlot({ onPlayInfinite, onOpenSettings }: { onPlayInfinite: () => void; onOpenSettings: () => void }) {
  const { user } = useAuth();
  const [justSet, setJustSet] = useState(() => reminderJustSet());
  const [promptClosed, setPromptClosed] = useState(false);
  const reminders = user?.reminders;
  const isInfinitePlayer = !!user?.infinite;

  const me: InfiniteMeResponse | null = useSyncedResource({
    flag: "infinite",
    key: ME_CACHE_KEY,
    fetcher: getInfiniteMe,
    enabled: isInfinitePlayer,
  }).data;
  const tiers: InfiniteTiersResponse | null = useSyncedResource({
    flag: "tiers",
    key: TIERS_CACHE_KEY,
    fetcher: getInfiniteTiers,
    enabled: isInfinitePlayer,
  }).data;

  // Set from the post-sign-in popup while this screen was already showing.
  const latestJustSet = reminderJustSet();
  if (latestJustSet !== justSet) setJustSet(latestJustSet);

  if (!user) return null;

  // Only while reminders really are on: turning them off in Settings, or
  // logging out (which removes this browser's notifications), hides it.
  if (justSet && reminders && (reminders.email || reminders.push)) {
    return <ReminderSetCard time={reminders.time} byEmail={!reminders.push} onChange={onOpenSettings} />;
  }

  // Older backends have no `reminders`; reminders already on means the card
  // was answered on another device or in Settings.
  const showPrompt = reminders && !reminders.promptAnswered && !reminders.email && !reminders.push && !promptClosed;
  if (showPrompt) {
    return (
      <ReminderPrompt
        onDone={() => {
          setPromptClosed(true);
          setJustSet(reminderJustSet());
        }}
      />
    );
  }

  if (me && me.today.gamesCompleted === 0 && !me.today.qualified) {
    return <InfiniteNudge me={me} tiers={tiers} onPlay={onPlayInfinite} />;
  }
  return null;
}
