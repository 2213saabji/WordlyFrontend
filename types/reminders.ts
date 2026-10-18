// Daily reminders by email and browser push (backend API_DOCUMENTATION.md §11).

/** The local times a player can pick: morning, evening, night. */
export type ReminderTime = "09:00" | "20:00" | "22:00";

/** `user.reminders` on every user object (GET /auth/me). */
export interface ReminderSummary {
  email: boolean;
  /** At least one browser or installed app is subscribed to push. */
  push: boolean;
  time: ReminderTime;
  /** IANA timezone the time is in, e.g. "Asia/Kolkata". */
  timezone: string;
  /** Answered the home-screen reminder card (set a time or "Not now"). */
  promptAnswered: boolean;
}

/** GET /reminders, and the response of every reminder write. */
export interface ReminderSettings extends ReminderSummary {
  pushDevices: number;
  /** ISO instant of the next reminder; null while both channels are off. */
  nextSendAt: string | null;
  timeOptions: ReminderTime[];
  /** The server has VAPID keys; false means email only. */
  pushAvailable: boolean;
  /** applicationServerKey for pushManager.subscribe(); null when push isn't available. */
  vapidPublicKey: string | null;
}

export interface ReminderUpdate {
  email?: boolean;
  time?: ReminderTime;
  /** Send with `time`: Intl.DateTimeFormat().resolvedOptions().timeZone. */
  timezone?: string;
  promptAnswered?: boolean;
}

/** PushSubscription.toJSON(), as the backend expects it. */
export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
