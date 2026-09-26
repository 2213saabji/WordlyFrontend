"use client";

import { useEffect, useState, type ReactNode } from "react";
import Leaderboard from "@/components/Leaderboard";
import TierLeaderboard from "@/components/TierLeaderboard";
import TierPromotionAnnouncer from "@/components/TierPromotionModal";
import Loader from "@/components/Loader";
import HomeScreen from "@/components/screens/HomeScreen";
import InfiniteHubScreen from "@/components/screens/InfiniteHubScreen";
import HowTiersWorkScreen from "@/components/screens/HowTiersWorkScreen";
import TierHistoryScreen from "@/components/screens/TierHistoryScreen";
import DiamondStatusScreen from "@/components/screens/DiamondStatusScreen";
import VerificationFlowScreen from "@/components/screens/VerificationFlowScreen";
import { NotificationsScreen } from "@/components/Notifications";
import PlayScreen from "@/components/screens/PlayScreen";
import HistoryScreen from "@/components/screens/HistoryScreen";
import GroupsScreen from "@/components/screens/GroupsScreen";
import LoginScreen from "@/components/screens/LoginScreen";
import SignupScreen from "@/components/screens/SignupScreen";
import ForgotPasswordScreen from "@/components/screens/ForgotPasswordScreen";
import { useAuth } from "@/lib/auth-context";
import { INFINITE_TIERS_ENABLED, MONEY_ENABLED } from "@/lib/flags";
import { useScreen } from "@/lib/screen-context";
import { parseReplayParam, type ReplayInvite } from "@/lib/share";

function AppShell() {
  const { screen, push, back, replace } = useScreen();
  const [invite, setInvite] = useState<ReplayInvite | null>(() =>
    typeof window === "undefined" ? null : parseReplayParam(window.location.search),
  );

  useEffect(() => {
    if (!invite) return;
    // A replay link is only valid same-day (daily mode's word is already
    // server-date-scoped — see lib/share.ts), so this just deep-links into
    // today's Play Daily rather than fetching anything invite-specific.
    push({ name: "play", mode: "daily" });
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screenKey =
    screen.name === "leaderboard"
      ? `leaderboard-${screen.groupId}`
      : screen.name === "play"
        ? `play-${screen.mode}`
        : screen.name;

  // The fade-in is a transition between screens — the screen the page loads
  // on (e.g. after a refresh) just appears, rather than visibly animating in
  // on every reload.
  const [initialScreenKey] = useState(screenKey);
  const [hasNavigated, setHasNavigated] = useState(false);
  if (!hasNavigated && screenKey !== initialScreenKey) setHasNavigated(true);

  return (
    <div className="flex flex-1 flex-col">
      {INFINITE_TIERS_ENABLED && (
        <TierPromotionAnnouncer
          onOpenTierLeaderboard={(tier) => push({ name: "tier-leaderboard", tier })}
          onPlay={() => push({ name: "play", mode: "infinite" })}
        />
      )}
      {invite && (
        <div className="mx-auto flex w-full max-w-lg animate-fade-in items-center gap-3 px-4 pt-4">
          <p className="flex-1 rounded-xl border border-accent/25 bg-accent/10 px-4 py-2.5 text-sm text-foreground/80">
            🎉 <span className="font-semibold">{invite.username}</span> invited you to today&apos;s GuessWord — good
            luck!
          </p>
          <button
            type="button"
            onClick={() => setInvite(null)}
            aria-label="Dismiss"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div key={screenKey} className={`flex flex-1 flex-col ${hasNavigated ? "animate-fade-in-up" : ""}`}>
        {screen.name === "home" && (
          <HomeScreen
            onPlay={() => push({ name: "play", mode: "daily" })}
            onPlayInfinite={() =>
              push(INFINITE_TIERS_ENABLED ? { name: "infinite-hub" } : { name: "play", mode: "infinite" })
            }
            onHistory={() => push({ name: "history" })}
            onGroups={() => push({ name: "groups" })}
            onOpenLeaderboard={(groupId?: string) => push({ name: "leaderboard", groupId })}
          />
        )}
        {screen.name === "infinite-hub" && (
          <InfiniteHubScreen
            onBack={back}
            onPlay={() => push({ name: "play", mode: "infinite" })}
            onOpenTierLeaderboard={() => push({ name: "tier-leaderboard" })}
            onOpenHowTiersWork={() => push({ name: "how-tiers" })}
            onOpenDiamond={() => push({ name: "diamond" })}
            onOpenTierHistory={() => push({ name: "tier-history" })}
          />
        )}
        {screen.name === "how-tiers" && <HowTiersWorkScreen onBack={back} />}
        {screen.name === "tier-history" && <TierHistoryScreen onBack={back} />}
        {screen.name === "diamond" && (
          <DiamondStatusScreen
            onBack={back}
            onPlay={() => push({ name: "play", mode: "infinite" })}
            onVerify={MONEY_ENABLED ? (step) => push({ name: "verify", step }) : undefined}
          />
        )}
        {screen.name === "notifications" && INFINITE_TIERS_ENABLED && (
          <NotificationsScreen onBack={back} onNavigate={(target) => replace(target)} />
        )}
        {screen.name === "verify" && MONEY_ENABLED && (
          <VerificationFlowScreen startStep={screen.step} onClose={back} />
        )}
        {screen.name === "play" && (
          <PlayScreen
            mode={screen.mode}
            onBack={back}
            onOpenLeaderboard={(groupId?: string) => push({ name: "leaderboard", groupId })}
            onPlayInfinite={() => replace({ name: "play", mode: "infinite" })}
            onOpenTierLeaderboard={() => push({ name: "tier-leaderboard" })}
          />
        )}
        {screen.name === "history" && <HistoryScreen onBack={back} />}
        {screen.name === "groups" && (
          <GroupsScreen onBack={back} onOpenLeaderboard={(groupId) => push({ name: "leaderboard", groupId })} />
        )}
        {screen.name === "leaderboard" && (
          <Leaderboard
            groupId={screen.groupId}
            onBack={back}
            onSwitchScope={(groupId) => replace({ name: "leaderboard", groupId })}
            onOpenInfinite={INFINITE_TIERS_ENABLED ? () => replace({ name: "tier-leaderboard" }) : undefined}
          />
        )}
        {screen.name === "tier-leaderboard" && (
          <TierLeaderboard
            initialTier={screen.tier}
            onBack={back}
            onSwitchScope={(groupId) => replace({ name: "leaderboard", groupId })}
          />
        )}
      </div>
    </div>
  );
}

/** `intro` is the server-rendered crawlable intro from page.tsx. Crawlers
 * never sign in, so it's shown only where they land — the first (server)
 * render and the login screen — and never to signed-in players. */
export default function GameApp({ intro }: { intro: ReactNode }) {
  const { user, loading } = useAuth();
  const { screen, reset } = useScreen();

  if (loading) {
    // .auth-pending is hidden before first paint for a returning player with
    // a cached session (see the inline script in app/layout.tsx) — they go
    // straight to their cached screen instead of seeing this, then the intro.
    return (
      <div className="auth-pending contents">
        <Loader label="Loading…" />
        {intro}
      </div>
    );
  }

  if (!user) {
    // Falls through to LoginScreen for "login" and for any stale post-auth
    // screen.name (e.g. right after a logout/failed refresh) — this branch
    // never renders authenticated content, regardless of what screen.name
    // currently is.
    if (screen.name === "signup") {
      return <SignupScreen onSuccess={() => reset({ name: "home" })} onLogin={() => reset({ name: "login" })} />;
    }
    if (screen.name === "forgot-password") {
      return <ForgotPasswordScreen onBack={() => reset({ name: "login" })} />;
    }
    return (
      <>
        <LoginScreen
          onSuccess={() => reset({ name: "home" })}
          onSignup={() => reset({ name: "signup" })}
          onForgotPassword={() => reset({ name: "forgot-password" })}
        />
        {intro}
      </>
    );
  }

  return <AppShell />;
}
