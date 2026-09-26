// In-app notifications (tier promotion/demotion, demotion risk, and — money
// only — reward/payout/verification events). Payout events are also emailed
// by the backend. Filter out MONEY_NOTIFICATION_TYPES when MONEY_ENABLED is
// off (lib/flags.ts).

import type { NotificationsResponse } from "@/types";
import { apiFetch } from "./client";

export function getNotifications({ unread = false }: { unread?: boolean } = {}): Promise<NotificationsResponse> {
  return apiFetch(`/notifications${unread ? "?unread=true" : ""}`);
}

export function markNotificationsRead(ids: string[]): Promise<{ message: string }> {
  return apiFetch("/notifications/read", { method: "POST", body: { ids } });
}
