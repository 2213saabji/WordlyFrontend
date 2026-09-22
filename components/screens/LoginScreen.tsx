"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { ApiRequestError } from "@/lib/api";
import AuthLayout from "@/components/AuthLayout";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function LoginScreen({
  onSuccess,
  onSignup,
  onForgotPassword,
}: {
  onSuccess: () => void;
  onSignup: () => void;
  onForgotPassword: () => void;
}) {
  const { login, passkeySupported, loginWithPasskey } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Recovery path for a device that lost its stored deviceId (cleared
  // storage) — see the Passkey API doc's "Recovery" flow. Only offered when
  // this browser actually supports WebAuthn.
  async function handlePasskeyLogin() {
    setError(null);
    setPasskeySubmitting(true);
    try {
      await loginWithPasskey();
      onSuccess();
    } catch (err) {
      // @simplewebauthn/browser wraps the raw browser error in its own
      // WebAuthnError (a plain Error subclass, not a DOMException) to give a
      // more specific message — check `.name` on either shape, not just
      // `instanceof DOMException`, or these get missed entirely.
      const name = err instanceof DOMException || err instanceof Error ? err.name : undefined;
      // A cancelled OS prompt (Face ID/Touch ID sheet dismissed) isn't an
      // error worth surfacing — the user just backed out.
      if (name !== "NotAllowedError") {
        // Full detail (SecurityError/rpId mismatch, etc.) is a config/debug
        // concern, not something a user can act on — log it for us, but
        // show them a plain, friendly fallback instead. ApiRequestError
        // messages are the backend's own user-facing copy, so those still
        // pass straight through.
        console.error("Passkey sign-in failed:", err);
        setError(
          err instanceof ApiRequestError
            ? err.message
            : "Passkey sign-in isn't available right now — log in with your email and password instead.",
        );
      }
    } finally {
      setPasskeySubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Pick up your streak right where you left off.">
      <h1 className="text-2xl font-bold">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>

        {error && <p className="animate-fade-in text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent py-2 font-medium text-white shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/40 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-3 text-xs text-foreground/45">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-5">
        <GoogleSignInButton onSuccess={onSuccess} onError={setError} />
      </div>

      {passkeySupported && (
        <button
          type="button"
          onClick={handlePasskeyLogin}
          disabled={passkeySubmitting}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-3 text-sm font-medium transition-all duration-150 hover:border-accent/30 hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
        >
          🔑 {passkeySubmitting ? "Waiting for passkey…" : "Sign in with a passkey"}
        </button>
      )}

      <div className="mt-6 flex flex-col gap-1 text-sm text-foreground/70">
        <button type="button" onClick={onForgotPassword} className="text-left transition-colors hover:text-foreground">
          Forgot password?
        </button>
        <span>
          No account?{" "}
          <button type="button" onClick={onSignup} className="font-medium text-accent hover:underline">
            Sign up
          </button>
        </span>
      </div>
    </AuthLayout>
  );
}
