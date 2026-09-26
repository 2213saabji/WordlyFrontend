"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Loader from "@/components/Loader";
import TierBadge from "@/components/TierBadge";
import {
  ApiRequestError,
  getInfiniteTiers,
  getVerificationStatus,
  sendMobileOtp,
  sendVerificationEmail,
  submitBankDetails,
  verifyMobileOtp,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { readCache, writeCache } from "@/lib/cache";
import { formatInr } from "@/lib/tiers";
import type { InfiniteTiersResponse, VerificationStatusResponse, VerificationStep } from "@/types";

// MONEY — only reachable with MONEY_ENABLED (see GameApp).

const TIERS_CACHE_KEY = "infinite:tiers";
const VERIFICATION_CACHE_KEY = "infinite:verification";
const RESEND_SECONDS = 60;
// Any country is accepted (E.164); +91 is only the prefilled default.
const DEFAULT_COUNTRY_CODE = "+91";
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const MUTED = "text-[#9a8aa2]";
const SOFT = "text-[#c9bfcc]";
const INPUT =
  "w-full rounded-[14px] border border-white/12 bg-white/5 px-4 py-[15px] text-[15px] outline-none transition-colors placeholder:text-[#6f6376] focus:border-[1.5px] focus:border-accent";

type Step = "intro" | "mobile-number" | "mobile-code" | "email" | "bank" | "done";

const STEP_INDEX: Partial<Record<Step, number>> = {
  "mobile-number": 1,
  "mobile-code": 1,
  email: 2,
  bank: 3,
};

const REVIEW_DETAIL: Record<NonNullable<VerificationStatusResponse["reviewCase"]>["detail"], string> = {
  phone: "mobile number",
  email: "email",
  bank: "bank account",
};

function stepFor(s: VerificationStep): Step {
  return s === "mobile" ? "mobile-number" : s;
}

/** User-facing copy for the API_DOCUMENTATION.md §7 error codes. */
function errorMessage(err: unknown): string {
  if (!(err instanceof ApiRequestError)) return "Something went wrong";
  const wait = err.data?.retryAfterSeconds;
  const later = wait ? `Try again in ${formatWait(wait)}.` : "Try again in a few minutes.";
  switch (err.data?.code) {
    case "PHONE_INVALID":
      return "Enter the number with its country code, like +91 98765 43210.";
    case "OTP_INVALID":
      return "That code didn't work. Check it and try again, or request a new one.";
    case "OTP_RATE_LIMITED":
      return `Too many codes requested. ${later}`;
    case "OTP_SEND_FAILED":
      return "We couldn't send the code. Try again.";
    case "SMS_PROVIDER_NOT_CONFIGURED":
      return "Mobile verification is coming soon. Your cycle days keep counting in the meantime.";
    case "EMAIL_RATE_LIMITED":
      return `A link was just sent. ${later}`;
    case "EMAIL_SEND_FAILED":
      return "We couldn't send the email. Try again.";
    case "BANK_NAME_INVALID":
      return "Enter the account holder's name (2 to 100 characters).";
    case "BANK_ACCOUNT_INVALID":
      return "Account numbers are 9 to 18 digits.";
    case "IFSC_INVALID":
      return "IFSC is 11 characters, like HDFC0001234.";
    case "TIER1_REQUIRED":
      return "Verification opens once you reach Diamond.";
    default:
      return err.message;
  }
}

function formatWait(seconds: number): string {
  return seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)} min`;
}

/** The Tier 1 payout verification flow: mobile (SMS code) → email (link) →
 * bank (penny drop). Resumable — it opens at `startStep` or the first
 * incomplete step, and each step re-reads GET /verification/status before
 * moving on. Full-screen on mobile, a dialog on desktop. */
export default function VerificationFlowScreen({
  startStep,
  onClose,
}: {
  startStep?: VerificationStep;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatusResponse | null>(() =>
    readCache<VerificationStatusResponse>(VERIFICATION_CACHE_KEY),
  );
  const [tiers] = useState(() => readCache<InfiniteTiersResponse>(TIERS_CACHE_KEY));
  const [reward, setReward] = useState<{ amount: number; days: number } | null>(() => topReward(tiers));
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // mobile
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  // POST /verification/mobile/otp answers 503 until the SMS provider is live.
  const [smsUnavailable, setSmsUnavailable] = useState(false);
  // email
  const [emailSent, setEmailSent] = useState(false);
  // bank
  const [holder, setHolder] = useState(user?.username ?? "");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");

  // Every step endpoint returns the full status object — render from it.
  function applyStatus(res: VerificationStatusResponse): VerificationStatusResponse {
    writeCache(VERIFICATION_CACHE_KEY, res);
    setStatus(res);
    return res;
  }

  async function refreshStatus(): Promise<VerificationStatusResponse> {
    return applyStatus(await getVerificationStatus());
  }

  /** Shows the error and, for rate limits, starts the resend countdown. */
  function fail(err: unknown) {
    setError(errorMessage(err));
    const wait = err instanceof ApiRequestError ? err.data?.retryAfterSeconds : undefined;
    if (wait) setResendIn(wait);
    if (err instanceof ApiRequestError && err.data?.code === "SMS_PROVIDER_NOT_CONFIGURED") setSmsUnavailable(true);
  }

  function goToNext(res: VerificationStatusResponse) {
    setError(null);
    setStep(res.nextStep ? stepFor(res.nextStep) : "done");
  }

  useEffect(() => {
    getInfiniteTiers()
      .then((res) => {
        writeCache(TIERS_CACHE_KEY, res);
        setReward(topReward(res));
      })
      .catch(() => {});
    getVerificationStatus()
      .then((fetched) => {
        const res = applyStatus(fetched);
        const untouched = (["mobile", "email", "bank"] as const).every((s) => res[s].status === "not_started");
        if (startStep && res[startStep].status !== "verified") setStep(stepFor(startStep));
        else if (untouched) setStep("intro");
        else goToNext(res);
      })
      .catch((err) => {
        setError(errorMessage(err));
        setStep("intro");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [resendIn]);

  const e164 = `${countryCode}${phone}`;
  // E.164: at most 15 digits including the country code.
  const phoneValid = /^\+[1-9]\d{0,3}$/.test(countryCode) && phone.length >= 4 && e164.length <= 16;

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      const res = applyStatus(await sendMobileOtp(e164));
      // "This number is already verified" — no SMS was sent.
      if (res.mobile.status === "verified") return goToNext(res);
      setCode("");
      setResendIn(RESEND_SECONDS);
      setStep("mobile-code");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  // Takes the code explicitly: the auto-submit on the 6th digit fires
  // before `code` state has updated.
  async function submitCode(value: string = code) {
    setBusy(true);
    setError(null);
    try {
      goToNext(applyStatus(await verifyMobileOtp(e164, value)));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    setBusy(true);
    setError(null);
    try {
      const res = applyStatus(await sendVerificationEmail());
      if (res.email.status === "verified") return goToNext(res);
      setEmailSent(true);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function checkEmail() {
    setBusy(true);
    setError(null);
    try {
      const res = await refreshStatus();
      if (res.email.status === "verified") goToNext(res);
      else setError("Not confirmed yet. Open the link in the email, then try again.");
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function submitBank(e?: FormEvent) {
    e?.preventDefault();
    const name = holder.trim();
    const accountNumber = account.replace(/\s+/g, "");
    if (name.length < 2 || name.length > 100) return setError("Enter the account holder's name (2 to 100 characters).");
    if (!/^\d{9,18}$/.test(accountNumber)) return setError("Account numbers are 9 to 18 digits.");
    if (!IFSC_RE.test(ifsc)) return setError("IFSC is 11 characters, like HDFC0001234.");
    setBusy(true);
    setError(null);
    try {
      goToNext(applyStatus(await submitBankDetails({ accountHolderName: name, accountNumber, ifsc })));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  // --- per-step content ---
  const amount = reward ? formatInr(reward.amount) : "your reward";
  let title: ReactNode = null;
  let body: ReactNode = null;
  let primary: { label: string; onClick: () => void; disabled?: boolean } | null = null;
  let secondary: { label: string; onClick: () => void } | null = null;
  let footnote: ReactNode = null;

  switch (step) {
    case "intro":
      title = "You reached Diamond";
      body = (
        <>
          <p className={`text-sm leading-[1.55] md:text-[14.5px] ${SOFT}`}>
            {reward ? `Stay ${reward.days} days in a row to earn ${amount}. ` : ""}Before we can send it, confirm three
            details. Each can be linked to only one GuessWord account.
          </p>
          <div className="flex flex-col rounded-[20px] border border-white/8 bg-white/[0.045] md:rounded-[18px] md:border-0 md:bg-white/4">
            <IntroRow n={1} title="Mobile number" sub="6-digit code by SMS" done={status?.mobile.status === "verified"} />
            <IntroRow n={2} title="Email" sub="Link sent to your account email" done={status?.email.status === "verified"} />
            <IntroRow n={3} title="Bank account" sub="We send ₹1 to check the name matches" done={status?.bank.status === "verified"} last />
          </div>
        </>
      );
      footnote = "Your cycle days count while you verify. You can stop and finish later.";
      primary = {
        label: status?.nextStep && status.nextStep !== "mobile" ? `Continue with ${status.nextStep}` : "Start with mobile",
        onClick: () => setStep(status?.nextStep ? stepFor(status.nextStep) : "mobile-number"),
      };
      secondary = { label: "Later", onClick: onClose };
      break;

    case "mobile-number":
      title = "Your mobile number";
      body = (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneValid && !smsUnavailable) requestCode();
          }}
          className="flex flex-col gap-[7px]"
        >
          <span className={`text-[12.5px] md:text-[13px] ${MUTED}`}>We&apos;ll text a 6-digit code to this number.</span>
          <div className="flex gap-2">
            <input
              aria-label="Country code"
              inputMode="tel"
              autoComplete="tel-country-code"
              value={countryCode}
              onChange={(e) => setCountryCode(`+${e.target.value.replace(/\D/g, "").slice(0, 4)}`)}
              className={`${INPUT} w-21 flex-none text-center`}
            />
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 14))}
              className={`${INPUT} tracking-[0.06em]`}
            />
          </div>
        </form>
      );
      footnote = "One GuessWord account per number.";
      primary = smsUnavailable
        ? { label: "Got it", onClick: onClose }
        : { label: busy ? "Sending…" : "Send code", onClick: requestCode, disabled: busy || !phoneValid };
      secondary = { label: "Back", onClick: () => setStep("intro") };
      break;

    case "mobile-code":
      title = "Enter the code";
      body = (
        <>
          <p className={`text-sm md:text-[14.5px] ${SOFT}`}>
            Sent to {countryCode} {phone}.{" "}
            <button type="button" onClick={() => setStep("mobile-number")} className="text-accent hover:underline">
              Change
            </button>
          </p>
          <OtpInput value={code} onChange={setCode} onComplete={submitCode} />
          <div className="flex items-center justify-between">
            {resendIn > 0 ? (
              <span className={`text-[13px] ${MUTED}`}>
                Resend in {Math.floor(resendIn / 60)}:{String(resendIn % 60).padStart(2, "0")}
              </span>
            ) : (
              <button type="button" onClick={requestCode} disabled={busy} className="text-[13px] font-semibold text-accent">
                Resend code
              </button>
            )}
          </div>
        </>
      );
      primary = { label: busy ? "Checking…" : "Verify", onClick: () => submitCode(), disabled: busy || code.length !== 6 };
      break;

    case "email":
      title = emailSent ? "Check your email" : "Confirm your email";
      body = (
        <>
          <p className={`text-sm leading-[1.55] md:text-[14.5px] ${SOFT}`}>
            {emailSent
              ? `We sent a link to ${user?.email ?? "your account email"}. Open it, then come back here.`
              : `We'll send a confirmation link to ${user?.email ?? "your account email"}.`}
          </p>
          {emailSent && (
            <div className="flex items-center justify-between">
              {resendIn > 0 ? (
                <span className={`text-[13px] ${MUTED}`}>
                  Resend in {Math.floor(resendIn / 60)}:{String(resendIn % 60).padStart(2, "0")}
                </span>
              ) : (
                <button type="button" onClick={sendEmail} disabled={busy} className="text-[13px] font-semibold text-accent">
                  Resend link
                </button>
              )}
            </div>
          )}
        </>
      );
      footnote = "Signed in with Google? Your email is already confirmed.";
      primary = emailSent
        ? { label: busy ? "Checking…" : "I've confirmed it", onClick: checkEmail, disabled: busy }
        : { label: busy ? "Sending…" : "Send link", onClick: sendEmail, disabled: busy };
      break;

    case "bank":
      title = "Bank account";
      body = (
        <form onSubmit={submitBank} className="flex flex-col gap-3.5 md:gap-5">
          <p className={`text-sm leading-normal md:text-[14.5px] ${SOFT}`}>
            Your {amount} is sent here. We&apos;ll deposit ₹1 to confirm the account holder&apos;s name.
          </p>
          {status?.bank.status === "name_mismatch" && (
            <p className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
              The name on that account didn&apos;t match. Enter it exactly as your bank has it.
            </p>
          )}
          <Field label="Account holder name">
            <input value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="name" className={INPUT} />
          </Field>
          <div className="flex flex-col gap-3.5 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-3">
            <Field label="Account number">
              <input
                inputMode="numeric"
                value={account}
                onChange={(e) => setAccount(formatAccount(e.target.value))}
                className={`${INPUT} tracking-[0.08em]`}
              />
            </Field>
            <Field label="IFSC">
              <input
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
                placeholder="e.g. HDFC0001234"
                className={INPUT}
              />
            </Field>
          </div>
          {/* lets Enter submit */}
          <button type="submit" className="hidden" />
        </form>
      );
      footnote = "Stored encrypted. We only ever show the last 4 digits.";
      primary = { label: busy ? "Submitting…" : "Verify account", onClick: () => submitBank(), disabled: busy };
      secondary = { label: "Back", onClick: onClose };
      break;

    case "done": {
      // nextStep is null either when complete or while the bank check runs.
      const checking = !status?.complete && status?.bank.status === "pending";
      title = checking ? "Checking your bank details" : "You're verified";
      body = (
        <p className={`text-sm leading-[1.55] md:text-[14.5px] ${SOFT}`}>
          {checking
            ? "We've sent ₹1 to confirm the name. We'll let you know if anything needs fixing."
            : `All three details are confirmed. Each completed cycle's ${amount} goes to your bank account.`}
        </p>
      );
      primary = { label: "Done", onClick: onClose };
      break;
    }
  }

  const index = step ? STEP_INDEX[step] : undefined;
  const stepLabel = index ? `Step ${index} of 3` : "3 steps";

  const progress = (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1 flex-1 rounded-sm ${
            step === "done" || (index !== undefined && n <= index) ? "bg-accent" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );

  const primaryButton = primary && (
    <button
      type="button"
      onClick={primary.onClick}
      disabled={primary.disabled}
      className="w-full rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/25 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none md:w-auto md:rounded-[15px] md:px-7 md:py-[15px] md:text-[15px]"
    >
      {primary.label}
    </button>
  );
  const secondaryButton = secondary && (
    <button
      type="button"
      onClick={secondary.onClick}
      className="hidden rounded-[15px] border border-white/12 bg-white/7 px-6 py-[15px] text-[15px] font-semibold transition-colors hover:border-accent/40 md:block"
    >
      {secondary.label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-40 flex animate-fade-in flex-col bg-background md:items-center md:justify-center md:bg-[#09060b]/55 md:p-14"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Verify to get paid"
        className="flex flex-1 flex-col overflow-y-auto md:w-140 md:flex-none md:animate-fade-in-up md:gap-5.5 md:rounded-[28px] md:border md:border-white/10 md:bg-[#1f1725] md:p-9 md:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]"
      >
        {/* mobile header */}
        <div className="flex items-center gap-3.5 px-6 pt-6 md:hidden">
          <button
            type="button"
            onClick={
              step === "mobile-number"
                ? () => setStep("intro")
                : step === "mobile-code"
                  ? () => setStep("mobile-number")
                  : onClose
            }
            aria-label="Back"
            className="flex size-[34px] flex-none items-center justify-center rounded-xl bg-white/7 transition-colors hover:bg-white/12"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-[17px]">
              <path d="m12 19-7-7 7-7M19 12H5" />
            </svg>
          </button>
          <span className="text-[15.5px] font-semibold">Verify to get paid</span>
          <span className={`ml-auto text-[12.5px] ${MUTED}`}>{stepLabel}</span>
        </div>
        <div className="px-6 pt-4 md:hidden">{progress}</div>

        {/* desktop header */}
        {step === "intro" ? (
          <div className="hidden items-center justify-between md:flex">
            <TierBadge tier={1} size="lg" />
            <span className={`text-[13px] ${MUTED}`}>{stepLabel}</span>
          </div>
        ) : (
          <div className="hidden flex-col gap-5 md:flex">
            {progress}
            <span className={`text-[13px] ${MUTED}`}>{stepLabel}</span>
          </div>
        )}

        {step === null ? (
          <Loader label="Loading…" />
        ) : (
          <div className="flex flex-col gap-3.5 px-6 pt-[30px] md:gap-5.5 md:p-0">
            {step === "intro" && (
              <span className="md:hidden">
                <TierBadge tier={1} size="lg" />
              </span>
            )}
            <h2 className="font-display text-[28px] font-bold leading-[1.1] md:font-sans md:text-[34px] md:font-light md:tracking-[-0.03em]">
              {title}
            </h2>
            {body}
            {status?.reviewCase && (step === "intro" || step === "done") && (
              <p className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] leading-normal">
                Your payout is on hold for review: this {REVIEW_DETAIL[status.reviewCase.detail]} is already linked to
                another GuessWord account. You keep your tier while we check.
              </p>
            )}
            {error && <p className="text-[13px] leading-normal text-danger">{error}</p>}
            {footnote && <span className={`text-xs leading-normal md:text-[12.5px] ${MUTED}`}>{footnote}</span>}
          </div>
        )}

        <div className="mt-auto px-6 pb-[26px] pt-[22px] md:hidden">{primaryButton}</div>
        <div className="hidden justify-end gap-3 md:flex">
          {secondaryButton}
          {primaryButton}
        </div>
      </div>
    </div>
  );
}

function topReward(tiers: InfiniteTiersResponse | null): { amount: number; days: number } | null {
  const top = tiers?.tiers.find((t) => t.tier === 1);
  return top && top.rewardInr > 0 ? { amount: top.rewardInr, days: top.daysToStick } : null;
}

/** Groups digits in 4s ("5010 0234 7781") as the Figma shows. */
function formatAccount(raw: string): string {
  return raw
    .replace(/\D/g, "")
    .slice(0, 18)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

function IntroRow({ n, title, sub, done, last = false }: { n: number; title: string; sub: string; done?: boolean; last?: boolean }) {
  return (
    <div className={`flex gap-3.5 px-[18px] py-4 md:py-[15px] ${last ? "" : "border-b border-white/7"}`}>
      <span className={`font-display font-bold ${done ? "text-[#8fc274]" : "text-accent"}`}>{done ? "✓" : n}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold md:text-[14.5px]">{title}</span>
        <span className={`text-[12.5px] md:text-[13px] ${MUTED}`}>{sub}</span>
      </span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className={`text-[12.5px] md:text-[13px] ${MUTED}`}>{label}</span>
      {children}
    </label>
  );
}

/** Six digit boxes backed by one real input, so paste, SMS autofill
 * (autocomplete="one-time-code") and backspace all just work. */
function OtpInput({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (code: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(true);

  return (
    <div className="relative" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit code"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, 6);
          onChange(next);
          if (next.length === 6 && value.length < 6) onComplete(next);
        }}
        className="absolute inset-0 opacity-0"
      />
      <div className="grid grid-cols-6 gap-2 md:gap-2.5" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => {
          const active = focused && i === Math.min(value.length, 5);
          return (
            <span
              key={i}
              className={`flex h-[58px] items-center justify-center rounded-[14px] bg-white/5 font-display text-2xl font-bold md:h-16 md:text-[26px] ${
                active ? "border-[1.5px] border-accent" : "border border-white/12"
              }`}
            >
              {value[i] ?? ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
