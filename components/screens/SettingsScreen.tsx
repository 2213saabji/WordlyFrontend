"use client";

import { useEffect, useState, type ReactNode } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import Loader from "@/components/Loader";
import { InstallSheet } from "@/components/InstallPrompt";
import { ReminderTimePicker } from "@/components/ReminderCards";
import { getReminders, updateReminders } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { installKind, type InstallKind } from "@/lib/install";
import {
  devicePushState,
  isIos,
  requestPermission,
  subscribeThisDevice,
  unsubscribeThisDevice,
  type DevicePushState,
} from "@/lib/push";
import { browserTimezone, clearReminderJustSet } from "@/lib/reminders";
import type { ReminderSettings, ReminderTime } from "@/types";

// Settings, opened from the account menu and the "Reminder set" card. For
// now it's the daily reminder (time, this device's notifications, email) and
// installing the app.

const SOFT = "text-[#c9bfcc]";
const MUTED = "text-[#9a8aa2]";
const CARD = "flex flex-col gap-4 rounded-[22px] border border-white/9 bg-[#1f1725] p-5";

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 flex-none rounded-full transition-colors duration-200 disabled:opacity-50 ${checked ? "bg-accent" : "bg-white/15"}`}
    >
      <span
        className={`absolute top-1 left-1 size-5 rounded-full bg-foreground transition-transform duration-200 ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

function Row({ title, note, control }: { title: string; note: ReactNode; control: ReactNode }) {
  return (
    <div className="flex items-start gap-4 border-t border-white/7 pt-4">
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className={`text-[13px] leading-normal ${SOFT}`}>{note}</span>
      </span>
      {control}
    </div>
  );
}

function nextReminderLabel(nextSendAt: string | null): string {
  if (!nextSendAt) return "Reminders are off.";
  const at = new Date(nextSendAt);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = sameDay(at, today) ? "today" : sameDay(at, tomorrow) ? "tomorrow" : at.toLocaleDateString(undefined, { weekday: "long" });
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `Next reminder ${day} at ${time} — only sent if you haven't played yet.`;
}

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { user, applyReminders } = useAuth();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [failed, setFailed] = useState(false);
  const [device, setDevice] = useState<DevicePushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [install, setInstall] = useState<InstallKind | null>(null);
  const [canInstall, setCanInstall] = useState<InstallKind | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReminders()
      .then((s) => !cancelled && setSettings(s))
      .catch(() => !cancelled && setFailed(true));
    devicePushState()
      .then((s) => !cancelled && setDevice(s))
      .catch(() => !cancelled && setDevice("unsupported"));
    // Chrome may hand over its install event after this screen opens.
    const refreshInstall = () => setCanInstall(installKind());
    refreshInstall();
    window.addEventListener("guessword:installable", refreshInstall);
    return () => {
      cancelled = true;
      window.removeEventListener("guessword:installable", refreshInstall);
    };
  }, []);

  const apply = (next: ReminderSettings) => {
    setSettings(next);
    applyReminders(next);
  };

  const run = (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    task()
      .catch(() => setError("That didn't save. Check your connection and try again."))
      .finally(() => setBusy(false));
  };

  if (!settings) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-5 py-6 md:px-8 md:py-14">
        <ScreenHeader title="Settings" onBack={onBack} />
        {failed ? <p className={`text-sm ${MUTED}`}>Settings couldn&apos;t load right now.</p> : <Loader label="Loading settings…" />}
      </div>
    );
  }

  const changeTime = (time: ReminderTime) =>
    run(async () => {
      apply(await updateReminders({ time, timezone: browserTimezone() }));
      clearReminderJustSet();
    });

  const togglePush = (on: boolean) => {
    if (!on) {
      run(async () => {
        const next = await unsubscribeThisDevice();
        if (next) apply(next);
        setDevice("off");
      });
      return;
    }
    // The permission request must come straight from the tap (Safari).
    const permission = requestPermission();
    run(async () => {
      if ((await permission) !== "granted") {
        setDevice(Notification.permission === "denied" ? "blocked" : "off");
        return;
      }
      if (!settings.vapidPublicKey) return;
      await subscribeThisDevice(settings.vapidPublicKey);
      apply(await updateReminders({ time: settings.time, timezone: browserTimezone(), promptAnswered: true }));
      setDevice("on");
    });
  };

  const toggleEmail = (on: boolean) =>
    run(async () => {
      apply(
        await updateReminders(
          on ? { email: true, time: settings.time, timezone: browserTimezone(), promptAnswered: true } : { email: false },
        ),
      );
    });

  const pushOn = device === "on";
  const pushControlDisabled = busy || !settings.pushAvailable || device === "blocked" || device === "needs-install" || device === "unsupported" || device === null;
  const pushNote: ReactNode = !settings.pushAvailable
    ? "Notifications aren't available yet. Email reminders work."
    : device === "needs-install"
      ? (
          <>
            On iPhone, notifications work once GuessWord is on your home screen.{" "}
            {canInstall && (
              <button type="button" onClick={() => setInstall(canInstall)} className="font-semibold text-accent hover:underline">
                Show me how
              </button>
            )}
          </>
        )
      : device === "blocked"
        ? `Notifications are blocked for GuessWord in your ${isIos() ? "iPhone" : "browser"} settings. Allow them there, then come back.`
        : device === "unsupported"
          ? "This browser can't show notifications. Email reminders work."
          : pushOn
            ? "On. The reminder arrives as a notification here."
            : "Get the reminder as a notification on this device.";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 py-6 md:px-8 md:py-14">
      <ScreenHeader title="Settings" onBack={onBack} />

      <section className="flex animate-fade-in-up flex-col gap-3">
        <span className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${MUTED}`}>Daily reminder</span>
        <div className={CARD}>
          <span className={`text-[13px] leading-normal ${SOFT}`}>
            One reminder a day at the time you pick, when today&apos;s word is waiting. Nothing else.
          </span>
          <ReminderTimePicker value={settings.time} onChange={changeTime} disabled={busy} />
          <Row
            title="Notifications on this device"
            note={pushNote}
            control={<Toggle label="Notifications on this device" checked={pushOn} disabled={pushControlDisabled} onChange={togglePush} />}
          />
          <Row
            title="Email reminders"
            note={user ? `Sent to ${user.email}.` : "Sent to your account email."}
            control={<Toggle label="Email reminders" checked={settings.email} disabled={busy} onChange={toggleEmail} />}
          />
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <span className={`border-t border-white/7 pt-4 text-[12.5px] ${MUTED}`}>{nextReminderLabel(settings.nextSendAt)}</span>
        </div>
      </section>

      {canInstall && (
        <section className="flex animate-fade-in-up flex-col gap-3" style={{ animationDelay: "80ms" }}>
          <span className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${MUTED}`}>App</span>
          <div className={CARD}>
            <div className="flex items-center gap-4">
              <span className="flex size-11 flex-none items-center justify-center rounded-[13px] bg-accent text-xl font-bold text-background">
                G
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[15px] font-semibold">Add to home screen</span>
                <span className={`text-[13px] ${SOFT}`}>Opens full screen, one tap away.</span>
              </span>
              <button
                type="button"
                onClick={() => setInstall(canInstall)}
                className="rounded-[14px] bg-accent px-4 py-2.5 text-sm font-bold text-background"
              >
                {canInstall === "prompt" ? "Install" : "How"}
              </button>
            </div>
          </div>
        </section>
      )}

      {install && (
        <InstallSheet
          kind={install}
          onClose={() => {
            setInstall(null);
            setCanInstall(installKind());
          }}
        />
      )}
    </div>
  );
}
