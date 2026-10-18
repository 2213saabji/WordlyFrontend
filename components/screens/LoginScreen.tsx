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
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
