// Public contact form.

import { apiFetch } from "./client";

export type ContactCategory = "bug" | "word-suggestion" | "account" | "groups" | "other";

/** Public — no auth needed, and none is sent (the contact page is reachable
 * whether or not you're signed in). Fire-and-forget once the 201 comes
 * back: no confirmation email, no echoed data. */
export function submitContactMessage(payload: {
  category: ContactCategory;
  name: string;
  email: string;
  message: string;
}): Promise<{ message: string }> {
  return apiFetch("/contact", { method: "POST", body: payload, skipAuth: true });
}
