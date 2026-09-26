"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiRequestError, confirmVerificationEmail } from "@/lib/api";
import { useScreen } from "@/lib/screen-context";

type State = "checking" | "done" | "invalid" | "error";

/** Lands from the verification email's link and confirms it straight away.
 * The confirm call needs no login, so the link works on any device. */
export default function ConfirmEmailVerification({ token }: { token: string }) {
  const { reset } = useScreen();
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    confirmVerificationEmail(token)
      .then(() => setState("done"))
      .catch((err) => {
        if (err instanceof ApiRequestError && err.data?.code === "VERIFICATION_TOKEN_INVALID") setState("invalid");
        else {
          setMessage(err instanceof ApiRequestError ? err.message : "Something went wrong");
          setState("error");
        }
      });
  }, [token]);

  const buttonClass =
    "mt-6 inline-block rounded-xl bg-accent px-5 py-3 text-sm font-bold text-background transition-all hover:-translate-y-0.5";
  const back = (
    <Link href="/" onClick={() => reset({ name: "diamond" })} className={buttonClass}>
      Back to Diamond reward
    </Link>
  );
  // Sending a new link needs a session — the verify screen goes through the
  // usual login redirect when signed out.
  const resend = (
    <Link href="/" onClick={() => reset({ name: "verify", step: "email" })} className={buttonClass}>
      Send a new link
    </Link>
  );

  if (state === "checking") return <p className="text-sm text-foreground/60">Confirming your email…</p>;
  if (state === "done") {
    return (
      <div>
        <p className="text-sm text-foreground/75">Your email is confirmed. You can close this tab or carry on verifying.</p>
        {back}
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm text-danger">
        {state === "invalid" ? "This link has expired or was already used." : message}
      </p>
      {state === "invalid" ? resend : back}
    </div>
  );
}
