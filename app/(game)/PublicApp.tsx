"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import HomeScreen from "@/components/screens/HomeScreen";
import PlayScreen from "@/components/screens/PlayScreen";
import LoginScreen from "@/components/screens/LoginScreen";
import SignupScreen from "@/components/screens/SignupScreen";
import ForgotPasswordScreen from "@/components/screens/ForgotPasswordScreen";
import { useAuth } from "@/lib/auth-context";
import { readPendingSignup } from "@/lib/pending-signup";
import { useScreen, type Screen } from "@/lib/screen-context";

const PUBLIC_BOARD = "/leaderboard/infinite";

/** The public app on "/": the guest home, guest Infinite rounds (public
 * API, no token) and the sign-in screens, which open only when asked for —
 * the Log in button, or any login-only action (Play Daily,
 * groups, history), which then lands there once signed in. A signed-in
 * player is sent to the app on "/home".
 *
 * `intro` is the server-rendered crawlable intro from page.tsx, shown under
 * the guest home (crawlers never sign in). */
export default function PublicApp({ intro }: { intro: ReactNode }) {
  const { user, loading, sessionChecked } = useAuth();
  const { screen, push, back, reset } = useScreen();
  const router = useRouter();

  // Only once the server has confirmed the session: a cached user whose
  // session is gone (revoked, expired, another backend) would otherwise be
  // shown the signed-in app until the refresh fails — a signed-out visitor
  // must only ever see the guest home.
  const signedIn = !!user && sessionChecked;
  useEffect(() => {
    // Keeps the query, e.g. a ?replay= invite (lib/share.ts) — the
    // signed-in app reads it.
    if (signedIn) router.replace(`/home${window.location.search}`);
  }, [signedIn, router]);

  // A refresh mid-signup (waiting for the emailed code) resumes the
  // enter-code step instead of dropping the visitor on the home page.
  useEffect(() => {
    if (!loading && !user && readPendingSignup()) reset({ name: "signup" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  if (loading) {
    // .auth-pending is hidden before first paint for a returning player with
    // a cached session (see the inline script in app/layout.tsx) — they're
    // on their way to "/home".
    return (
      <div className="auth-pending contents">
        <Loader label="Loading…" />
        {intro}
      </div>
    );
  }

  // Checking a cached session, or on the way to /home.
  if (user) return <Loader label="Loading…" />;

  // The "/home" stack once signed in: home, then `then` on top (so its Back
  // leads home).
  const onSignedIn = (then?: Screen) => () => {
    reset();
    if (then) push(then);
  };
  const toLogin = (then?: Screen) => () => push({ name: "login", then });

  if (screen.name === "login") {
    const { then } = screen;
    return (
      <LoginScreen
        onSuccess={onSignedIn(then)}
        onSignup={() => reset({ name: "signup", then })}
        onForgotPassword={() => reset({ name: "forgot-password" })}
      />
    );
  }
  if (screen.name === "signup") {
    const { then } = screen;
    return (
      <SignupScreen
        onSuccess={onSignedIn(then)}
        onLogin={() => reset({ name: "login", then })}
        onForgotPassword={() => reset({ name: "forgot-password" })}
      />
    );
  }
  if (screen.name === "forgot-password") {
    return <ForgotPasswordScreen onBack={() => reset({ name: "login" })} />;
  }

  if (screen.name === "play" && screen.mode === "infinite") {
    return (
      <PlayScreen
        guest
        mode="infinite"
        onBack={back}
        onOpenLeaderboard={() => router.push(PUBLIC_BOARD)}
        onPlayInfinite={() => {}}
        onLogin={toLogin({ name: "infinite-hub" })}
      />
    );
  }

  // "home", and any signed-in screen left on the stack (e.g. after a logout).
  return (
    <>
      <HomeScreen
        guest
        onPlay={toLogin({ name: "play", mode: "daily" })}
        onPlayInfinite={() => push({ name: "play", mode: "infinite" })}
        onHistory={toLogin({ name: "history" })}
        onGroups={toLogin({ name: "groups" })}
        onOpenLeaderboard={() => router.push(PUBLIC_BOARD)}
      />
      {intro}
    </>
  );
}
