// Daily reminders: settings (email on/off, time of day, timezone, whether the
// home-screen card was answered) and this browser's push subscription.

import type { PushSubscriptionPayload, ReminderSettings, ReminderUpdate } from "@/types";
import { apiFetch } from "./client";

export function getReminders(): Promise<ReminderSettings> {
  return apiFetch("/reminders");
}

export function updateReminders(update: ReminderUpdate): Promise<ReminderSettings> {
  return apiFetch("/reminders", { method: "PATCH", body: update });
}

/** 503 PUSH_NOT_CONFIGURED when the server has no VAPID keys. */
export function addPushSubscription(subscription: PushSubscriptionPayload): Promise<ReminderSettings> {
  return apiFetch("/reminders/push-subscriptions", { method: "POST", body: subscription });
}

export function removePushSubscription(endpoint: string): Promise<ReminderSettings> {
  return apiFetch("/reminders/push-subscriptions", { method: "DELETE", body: { endpoint } });
}
