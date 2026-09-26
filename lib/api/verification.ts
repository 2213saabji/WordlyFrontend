// MONEY — Phase 2: Tier 1 identity verification (mobile → email → bank,
// resumable at any step). Only call these when MONEY_ENABLED is on
// (lib/flags.ts). Every route except email/confirm is 403 TIER1_REQUIRED
// unless the caller is in Tier 1 or has an unpaid payout. Every step route
// returns the full status object — re-render from it. Error codes: see
// API_DOCUMENTATION.md §7 and ApiErrorCode.

import type { BankDetailsRequest, VerificationItem, VerificationStatusResponse, VerificationStepResponse } from "@/types";
import { apiFetch } from "./client";

/** Current state of each step plus `nextStep` — the resume point. */
export function getVerificationStatus(): Promise<VerificationStatusResponse> {
  return apiFetch("/verification/status");
}

/** `phone` in E.164, any country (e.g. "+14155552671"). Limited to 3 per
 * 15 min; the code lasts 10 min. 503 SMS_PROVIDER_NOT_CONFIGURED until the
 * SMS provider is live. */
export function sendMobileOtp(phone: string): Promise<VerificationStepResponse> {
  return apiFetch("/verification/mobile/otp", { method: "POST", body: { phone } });
}

/** Same `phone` the code was requested for. 5 wrong tries lock the code. */
export function verifyMobileOtp(phone: string, code: string): Promise<VerificationStepResponse> {
  return apiFetch("/verification/mobile/verify", { method: "POST", body: { phone, code } });
}

/** Emails a 24h link to the account email; once a minute at most. Google
 * sign-in accounts are verified automatically on status load instead. */
export function sendVerificationEmail(): Promise<VerificationStepResponse> {
  return apiFetch("/verification/email/send", { method: "POST" });
}

/** `token` comes from the emailed /verify-email/<token> link. Needs no login
 * — the link may be opened on another device. */
export function confirmVerificationEmail(token: string): Promise<{ message: string; email: VerificationItem }> {
  return apiFetch("/verification/email/confirm", { method: "POST", body: { token }, skipAuth: true });
}

/** Starts the bank check (pending → verified | name_mismatch). The details
 * are only ever returned masked. Resubmitting restarts the step and holds
 * the current cycle's payout. */
export function submitBankDetails(details: BankDetailsRequest): Promise<VerificationStepResponse> {
  return apiFetch("/verification/bank", { method: "POST", body: details });
}
