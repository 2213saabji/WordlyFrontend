"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError, resendSignup } from "@/lib/api";
import AuthLayout from "@/components/AuthLayout";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  readPendingSignup as readPending,
  savePendingSignup as savePending,
  toPendingSignup as toPending,
  type PendingSignup as Pending,
} from "@/lib/pending-signup";

// Signup is two steps: the form emails a 6-digit code + link, and the
// account only exists once one of them is used. The pending email lives in
// sessionStorage (lib/pending-signup.ts) so a refresh on the code step
// resumes it — GameApp routes back here when one is waiting.

/** Where an error's follow-up button should go. */
type ErrorAction = "login" | "login-or-reset" | null;

interface ErrorState {
  message: string;
  action: ErrorAction;
}

function code(err: unknown) {
  return err instanceof ApiRequestError ? err.data?.code : undefined;
}

function retryAfter(err: unknown): number | undefined {
  return err instanceof ApiRequestError ? err.data?.retryAfterSeconds : undefined;
}

const INPUT =
  "rounded-lg border border-border bg-surface px-3 py-2 outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25";
const PRIMARY =
  "rounded-lg bg-accent py-2 font-medium text-white shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/40 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

export default function SignupScreen({
  onSuccess,
  onLogin,
  onForgotPassword,
}: {
  onSuccess: () => void;
  onLogin: () => void;
  onForgotPassword: () => void;
}) {
  const { signup, verifySignupCode } = useAuth();
  const [pending, setPending] = useState<Pending | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 5 wrong codes lock the current one — Resend becomes the main action.
  const [codeLocked, setCodeLocked] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Resume the code step after a refresh. sessionStorage is client-only, so
  // this can't be a lazy initial state without a hydration mismatch.
  useEffect(() => {
    const saved = readPending();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setPending(saved);
  }, []);

  // Drives the Resend countdown.
  useEffect(() => {
    if (!pending || pending.resendAt <= now) return;
    const id = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(id);
  }, [pending, now]);

  function enterCodeStep(p: Pending) {
    savePending(p);
    setPending(p);
    setNow(Date.now());
    setOtp("");
    setCodeLocked(false);
  }

  function backToForm(message?: string) {
    savePending(null);
    setPending(null);
    setOtp("");
    setNotice(null);
    setError(message ? { message, action: null } : null);
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await signup(username, email, password);
      enterCodeStep(toPending(res));
    } catch (err) {
      switch (code(err)) {
        case "EMAIL_TAKEN":
          setError({ message: "An account with this email already exists.", action: "login-or-reset" });
          break;
        case "SIGNUP_RATE_LIMITED":
          setError({ message: `Please wait ${retryAfter(err) ?? 60}s before trying again.`, action: null });
          break;
        case "EMAIL_SEND_FAILED":
          setError({ message: "We couldn't send the email. Please try again.", action: null });
          break;
        default:
          setError({ message: err instanceof ApiRequestError ? err.message : "Something went wrong", action: null });
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Takes the code explicitly: the auto-submit on the 6th digit fires
  // before `otp` state has updated.
  async function handleVerify(value: string = otp) {
    if (!pending || value.length !== 6) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      // Always a string — codes can start with 0.
      await verifySignupCode(pending.email, value);
      savePending(null);
      onSuccess();
    } catch (err) {
      switch (code(err)) {
        case "SIGNUP_CODE_INVALID":
          setError({
            message: "That code is wrong or has expired. Request a new one, or if you already clicked the link in the email, log in.",
            action: "login",
          });
          break;
        case "SIGNUP_CODE_ATTEMPTS":
          setCodeLocked(true);
          setError({ message: "Too many wrong attempts. Request a new code.", action: null });
          break;
        case "SIGNUP_INVALID":
          savePending(null);
          setError({ message: "Your signup is already complete. Log in to continue.", action: "login" });
          break;
        case "EMAIL_TAKEN":
          savePending(null);
          setError({ message: "This email already has an account.", action: "login" });
          break;
        default:
          setError({ message: err instanceof ApiRequestError ? err.message : "Something went wrong", action: null });
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (!pending) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      enterCodeStep(toPending(await resendSignup(pending.email)));
      setNotice("New code sent. Earlier codes and links no longer work.");
    } catch (err) {
      switch (code(err)) {
        case "SIGNUP_RATE_LIMITED": {
          const p = { ...pending, resendAt: Date.now() + (retryAfter(err) ?? 60) * 1000 };
          savePending(p);
          setPending(p);
          setNow(Date.now());
          break;
        }
        case "SIGNUP_NOT_FOUND":
          backToForm("Your signup expired. Please sign up again.");
          break;
        case "EMAIL_SEND_FAILED":
          backToForm("We couldn't send the email. Please sign up again.");
          break;
        default:
          setError({ message: err instanceof ApiRequestError ? err.message : "Something went wrong", action: null });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const errorBlock = error && (
    <div className="animate-fade-in flex flex-col gap-1.5 text-sm">
      <p className="text-danger">{error.message}</p>
      {error.action && (
        <span className="flex gap-4">
          <button type="button" onClick={() => { savePending(null); onLogin(); }} className="font-medium text-accent hover:underline">
            Log in
          </button>
          {error.action === "login-or-reset" && (
            <button type="button" onClick={onForgotPassword} className="font-medium text-accent hover:underline">
              Forgot password?
            </button>
          )}
        </span>
      )}
    </div>
  );

  if (pending) {
    const wait = Math.max(0, Math.ceil((pending.resendAt - now) / 1000));
    return (
      <AuthLayout title="Almost there" subtitle="One quick step to keep your account safe.">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground/70">
          We sent a 6-digit code to <strong className="text-foreground">{pending.email}</strong>. Enter it below, or
          tap the link in the email. It expires in 15 minutes.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            Verification code
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtp(next);
                // Auto-submit on the 6th digit (paste / SMS-style autofill).
                if (next.length === 6 && otp.length < 6 && !submitting) handleVerify(next);
              }}
              className={`${INPUT} text-center font-mono text-2xl tracking-[0.5em]`}
            />
          </label>

          {errorBlock}
          {notice && <p className="animate-fade-in text-sm text-correct">{notice}</p>}

          <button type="submit" disabled={submitting || otp.length !== 6} className={PRIMARY}>
            {submitting ? "Verifying…" : "Verify email"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          {wait > 0 ? (
            <span className="text-foreground/50">Resend code in {wait}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={submitting}
              className={
                codeLocked
                  ? "rounded-lg bg-accent px-3 py-1.5 font-medium text-white disabled:opacity-50"
                  : "font-medium text-accent hover:underline disabled:opacity-50"
              }
            >
              Resend code
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEmail(pending.email);
              backToForm();
            }}
            className="text-foreground/70 transition-colors hover:text-foreground"
          >
            Change email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Join in" subtitle="Track your streak, race friends, and guess the word of the day.">
      <h1 className="text-2xl font-bold">Sign up</h1>

      <form onSubmit={handleSignup} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Username
          <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
          <span className="text-xs text-foreground/50">At least 8 characters</span>
        </label>

        {errorBlock}

        <button type="submit" disabled={submitting} className={PRIMARY}>
          {submitting ? "Sending code…" : "Sign up"}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-xs text-foreground/45">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-5">
        <GoogleSignInButton onSuccess={onSuccess} onError={(message) => setError({ message, action: null })} />
      </div>

      <span className="mt-6 block text-sm text-foreground/70">
        Already have an account?{" "}
        <button type="button" onClick={onLogin} className="font-medium text-accent hover:underline">
          Log in
        </button>
      </span>
    </AuthLayout>
  );
}
