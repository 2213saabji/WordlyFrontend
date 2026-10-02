// In-app notifications: tier promotion/demotion, demotion risk, coin
// purchases (and failed payments) and inactivity decay.

import type { NotificationsResponse } from "@/types";
import { apiFetch } from "./client";

export function getNotifications({ unread = false }: { unread?: boolean } = {}): Promise<NotificationsResponse> {
  return apiFetch(`/notifications${unread ? "?unread=true" : ""}`);
}

export function markNotificationsRead(ids: string[]): Promise<{ message: string }> {
  return apiFetch("/notifications/read", { method: "POST", body: { ids } });
}
