"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import HomeScreen from "@/components/screens/HomeScreen";
import PlayScreen from "@/components/screens/PlayScreen";
import LoginScreen from "@/components/screens/LoginScreen";
import SignupScreen from "@/components/screens/SignupScreen";
import ForgotPasswordScreen from "@/components/screens/ForgotPasswordScreen";
import { useAuth } from "@/lib/auth-context";
import { readPendingSignup } from "@/lib/pending-signup";
import { useScreen, type Screen } from "@/lib/screen-context";
import type { InfiniteLeaderboardResponse } from "@/types";

const PUBLIC_BOARD = "/leaderboard/infinite";

/** The guest side of "/" (see GameApp): the guest home, guest Infinite
 * rounds (public API, no token) and the sign-in screens, which open only
 * when asked for — the Log in button, or any login-only action (Play Daily,
 * groups, history), which then lands there once signed in.
 *
 * `intro` is the server-rendered crawlable intro from page.tsx, shown under
 * the guest home (crawlers never sign in). `initialPublicBoard` is the guest
 * home's board card data from the server render (null if that fetch failed). */
export default function PublicApp({
  intro,
  initialPublicBoard,
}: {
  intro: ReactNode;
  initialPublicBoard: InfiniteLeaderboardResponse | null;
}) {
  const { user, loading } = useAuth();
  const { screen, push, back, reset } = useScreen();
  const router = useRouter();

  // A refresh mid-signup (waiting for the emailed code) resumes the
  // enter-code step instead of dropping the visitor on the home page.
  useEffect(() => {
    if (!loading && !user && readPendingSignup()) reset({ name: "signup" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  // The signed-in stack once logged in: home, then `then` on top (so its
  // Back leads home). GameApp switches to the signed-in app by itself.
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
  // Also the server render (auth is still `loading` there), so crawlers and
  // first paint get the real guest home, not a loader. .auth-pending hides
  // it before first paint for a returning player with a cached session
  // (see the inline script in app/layout.tsx) — their signed-in screen
  // replaces it on hydration. The wrapper stays the same element either
  // way, so the screen isn't remounted when loading ends.
  return (
    <div className={loading ? "auth-pending contents" : "contents"}>
      <HomeScreen
        guest
        initialPublicBoard={initialPublicBoard}
        onPlay={toLogin({ name: "play", mode: "daily" })}
        onPlayInfinite={() => push({ name: "play", mode: "infinite" })}
        onHistory={toLogin({ name: "history" })}
        onGroups={toLogin({ name: "groups" })}
        onOpenLeaderboard={() => router.push(PUBLIC_BOARD)}
      />
      {intro}
    </div>
  );
}
