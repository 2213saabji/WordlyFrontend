// A signup waiting for its emailed code (POST /auth/signup → 202). Kept in
// sessionStorage so a refresh on the enter-code step resumes it instead of
// stranding the player; cleared once the signup completes or is abandoned.

import type { SignupPendingResponse } from "@/types";

const PENDING_KEY = "guessword_pending_signup";

export interface PendingSignup {
  /** Lowercased by the server — use this, not what was typed. */
  email: string;
  /** Epoch ms when Resend unlocks. */
  resendAt: number;
}

export function readPendingSignup(): PendingSignup | null {
  try {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingSignup) : null;
  } catch {
    return null;
  }
}

export function savePendingSignup(p: PendingSignup | null): void {
  try {
    if (p) window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else window.sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage blocked — the flow still works until a refresh.
  }
}

export function toPendingSignup(res: SignupPendingResponse): PendingSignup {
  return { email: res.email, resendAt: Date.now() + res.resendAfterSeconds * 1000 };
}
