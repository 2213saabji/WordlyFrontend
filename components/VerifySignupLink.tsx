"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { savePendingSignup } from "@/lib/pending-signup";
import { useScreen } from "@/lib/screen-context";

type State = "verifying" | "done" | "invalid" | "completed" | "taken" | "error";

/** Lands from the signup email's link and completes the signup on load:
 * creates the account and logs in *this* device (it may not be the one the
 * player signed up on). */
export default function VerifySignupLink({ token }: { token: string }) {
  const router = useRouter();
  const { verifySignupLink } = useAuth();
  const { reset } = useScreen();
  const [state, setState] = useState<State>("verifying");
  const [message, setMessage] = useState<string | null>(null);
  // The link is single use: a second call fails even when the first worked,
  // and StrictMode runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    verifySignupLink(token)
      .then(() => {
        savePendingSignup(null);
        setState("done");
        reset({ name: "home" });
        setTimeout(() => router.push("/"), 1500);
      })
      .catch((err) => {
        const code = err instanceof ApiRequestError ? err.data?.code : undefined;
        if (code === "SIGNUP_LINK_INVALID") setState("invalid");
        else if (code === "SIGNUP_INVALID") setState("completed");
        else if (code === "EMAIL_TAKEN") setState("taken");
        else {
          setMessage(err instanceof ApiRequestError ? err.message : "Something went wrong");
          setState("error");
        }
      });
  }, [token, verifySignupLink, reset, router]);

  const button = (label: string, screen: "login" | "signup", primary = true) => (
    <button
      type="button"
      onClick={() => {
        reset({ name: screen });
        router.push("/");
      }}
      className={
        primary
          ? "rounded-xl bg-accent px-5 py-3 text-sm font-bold text-background transition-all hover:-translate-y-0.5"
          : "rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:border-accent/40"
      }
    >
      {label}
    </button>
  );

  if (state === "verifying") return <p className="text-sm text-foreground/60">Verifying your email…</p>;

  if (state === "done") {
    return (
      <p className="animate-fade-in-up rounded-lg border border-correct/40 bg-correct/10 p-3 text-sm">
        Email verified! Welcome to GuessWord. Taking you to the game…
      </p>
    );
  }

  const text = {
    invalid: "This link is invalid or has expired.",
    completed: "Your signup is already complete.",
    taken: "This email already has an account.",
    error: message,
  }[state];

  return (
    <div className="flex animate-fade-in-up flex-col gap-4">
      <p className="text-sm text-danger">{text}</p>
      <div className="flex flex-wrap gap-3">
        {button("Log in", "login")}
        {state === "invalid" && button("Sign up again", "signup", false)}
      </div>
    </div>
  );
}
