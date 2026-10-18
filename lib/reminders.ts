// Turning daily reminders on: email always, plus push where this browser can
// do it (not on iPhone outside the home-screen app, with notifications
// blocked, or with push not set up on the server). Shared by the home card,
// the post-sign-in popup and Settings.

import { getReminders, updateReminders } from "@/lib/api";
import { pushPossibleHere, requestPermission, subscribeThisDevice } from "@/lib/push";
import type { ReminderSettings, ReminderTime } from "@/types";

export const REMINDER_TIMES: { time: ReminderTime; clock: string; label: string }[] = [
  { time: "09:00", clock: "9:00 AM", label: "Morning" },
  { time: "20:00", clock: "8:00 PM", label: "Evening" },
  { time: "22:00", clock: "10:00 PM", label: "Night" },
];

export const DEFAULT_REMINDER_TIME: ReminderTime = "20:00";

export function clockLabel(time: ReminderTime): string {
  return REMINDER_TIMES.find((t) => t.time === time)?.clock ?? time;
}

/** The browser's IANA timezone, e.g. "Asia/Kolkata". */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

/** "push" = a notification on this device as well as the email. */
export type ReminderChannel = "push" | "email";

/**
 * Turns reminders on at `time`: email, and push on this device if it can.
 * Call straight from the tap — the permission request has to come before
 * anything is awaited (Safari). `known` is the GET /reminders result if it's
 * already loaded; it tells whether the server can send push at all.
 */
export async function enableReminders(
  time: ReminderTime,
  known: ReminderSettings | null,
): Promise<{ settings: ReminderSettings; channel: ReminderChannel }> {
  let channel: ReminderChannel = "email";
  const tryPush = pushPossibleHere() && known?.pushAvailable !== false;
  if (tryPush) {
    const permission = await requestPermission();
    if (permission === "granted") {
      try {
        const current = known ?? (await getReminders());
        if (current.vapidPublicKey) {
          await subscribeThisDevice(current.vapidPublicKey);
          channel = "push";
        }
      } catch {
        // Subscribing failed (push service unreachable, server not set up):
        // email still works.
      }
    }
  }
  const settings = await updateReminders({ email: true, time, timezone: browserTimezone(), promptAnswered: true });
  justSet = { time, channel };
  return { settings, channel };
}

// The "Reminder set" card shows for the rest of this visit (until a reload),
// so it's kept outside React and survives leaving the home screen.
let justSet: { time: ReminderTime; channel: ReminderChannel } | null = null;

export function reminderJustSet() {
  return justSet;
}

export function clearReminderJustSet() {
  justSet = null;
}
