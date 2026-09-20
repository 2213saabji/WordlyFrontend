"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { resetPassword, ApiRequestError } from "@/lib/api";
import { useScreen } from "@/lib/screen-context";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { reset } = useScreen();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      reset({ name: "login" });
      setTimeout(() => router.push("/"), 2000);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 400) {
        setExpired(true);
      } else {
        setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="animate-fade-in-up rounded-lg border border-correct/40 bg-correct/10 p-3 text-sm">
        Password has been reset successfully. Redirecting to log in…
      </p>
    );
  }

  if (expired) {
    return (
      <div className="flex animate-fade-in-up flex-col gap-3">
        <p className="text-sm text-danger">
          This reset link is invalid or has expired.
        </p>
        <button
          type="button"
          onClick={() => {
            reset({ name: "forgot-password" });
            router.push("/");
          }}
          className="text-sm text-accent hover:underline"
        >
          Request a new link
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        New password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Confirm password
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
      </label>

      {error && <p className="animate-fade-in text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-accent py-2 font-medium text-white shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/40 active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        {submitting ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
