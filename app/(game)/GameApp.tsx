"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import Leaderboard from "@/components/Leaderboard";
import TierLeaderboard from "@/components/TierLeaderboard";
import TierPromotionAnnouncer from "@/components/TierPromotionModal";
import Training from "@/components/Training";
import Loader from "@/components/Loader";
import HomeScreen from "@/components/screens/HomeScreen";
import InfiniteHubScreen from "@/components/screens/InfiniteHubScreen";
import HowTiersWorkScreen from "@/components/screens/HowTiersWorkScreen";
import TierHistoryScreen from "@/components/screens/TierHistoryScreen";
import DiamondStatusScreen from "@/components/screens/DiamondStatusScreen";
import CoinsScreen from "@/components/screens/CoinsScreen";
import { NotificationsScreen } from "@/components/Notifications";
import PlayScreen from "@/components/screens/PlayScreen";
import HistoryScreen from "@/components/screens/HistoryScreen";
import GroupsScreen from "@/components/screens/GroupsScreen";
import SettingsScreen from "@/components/screens/SettingsScreen";
import { InstallPromptHost } from "@/components/InstallPrompt";
import { useAuth } from "@/lib/auth-context";
import { registerServiceWorker } from "@/lib/push";
import { PRE_AUTH_SCREENS, useScreen, type PlayMode } from "@/lib/screen-context";
import { parseReplayParam, type ReplayInvite } from "@/lib/share";
import { runSync } from "@/lib/sync";
import PublicApp from "./PublicApp";

/** `intro`: the crawlable intro from page.tsx, shown under the home screen. */
function AppShell({ intro }: { intro: ReactNode }) {
  const { screen, push, back, replace, backTo } = useScreen();
  const [invite, setInvite] = useState<ReplayInvite | null>(() =>
    typeof window === "undefined" ? null : parseReplayParam(window.location.search),
  );

  useEffect(() => {
    // The daily reminder (push or email) links to /?play=daily|infinite.
    const play = new URLSearchParams(window.location.search).get("play");
    const reminderMode: PlayMode | null = play === "daily" || play === "infinite" ? play : null;
    if (!invite && !reminderMode) return;
    // A replay link is only valid same-day (daily mode's word is already
    // server-date-scoped — see lib/share.ts), so this just deep-links into
    // today's Play Daily rather than fetching anything invite-specific.
    push({ name: "play", mode: reminderMode ?? "daily" });
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The service worker shows reminder notifications; registering it early
  // also keeps an existing subscription alive. Not needed before sign-in.
  useEffect(() => {
    void registerServiceWorker()?.catch(() => {});
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

  // /sync on every screen change (throttled to 15 s in runSync) — a layout
  // effect so it starts before the new screen's own requests — and when the
  // tab becomes visible again. App start / sign-in sync lives in AuthProvider.
  useLayoutEffect(() => {
    void runSync();
  }, [screenKey]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void runSync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      {/* First-run tour; nothing once the account has finished it. */}
      <Training />
      <TierPromotionAnnouncer
        onOpenTierLeaderboard={(tier) => push({ name: "tier-leaderboard", tier })}
        onPlay={() => push({ name: "play", mode: "infinite" })}
      />
      <InstallPromptHost screen={screen.name} />
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
          <>
            <HomeScreen
              onPlay={() => push({ name: "play", mode: "daily" })}
              onPlayInfinite={() => push({ name: "infinite-hub" })}
              onHistory={() => push({ name: "history" })}
              onGroups={() => push({ name: "groups" })}
              onOpenLeaderboard={(groupId?: string) => push({ name: "leaderboard", groupId })}
              onOpenSettings={() => push({ name: "settings" })}
            />
            {intro}
          </>
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
        {/* Both lead back to the hub, wherever they were opened from. */}
        {screen.name === "how-tiers" && <HowTiersWorkScreen onBack={() => backTo({ name: "infinite-hub" })} />}
        {screen.name === "tier-history" && <TierHistoryScreen onBack={() => backTo({ name: "infinite-hub" })} />}
        {screen.name === "diamond" && (
          <DiamondStatusScreen onBack={back} onPlay={() => push({ name: "play", mode: "infinite" })} />
        )}
        {screen.name === "coins" && <CoinsScreen onBack={back} />}
        {screen.name === "settings" && <SettingsScreen onBack={back} />}
        {screen.name === "notifications" && (
          <NotificationsScreen onBack={back} onNavigate={(target) => replace(target)} />
        )}
        {screen.name === "play" && (
          <PlayScreen
            mode={screen.mode}
            onBack={back}
            onOpenLeaderboard={(groupId?: string) => push({ name: "leaderboard", groupId })}
            onPlayInfinite={() => replace({ name: "play", mode: "infinite" })}
            onOpenTierLeaderboard={() => push({ name: "tier-leaderboard" })}
            onOpenInfiniteHub={() => backTo({ name: "infinite-hub" })}
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
            onOpenInfinite={() => replace({ name: "tier-leaderboard" })}
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

/** The whole game on "/". A player with a session gets the signed-in app —
 * straight from the cached session on a reload, while /auth/refresh confirms
 * it in the background — and everyone else the guest app (PublicApp: guest
 * home, guest Infinite and the sign-in screens). Logging in or out swaps
 * between the two in place; there's no redirect.
 *
 * `intro` is the server-rendered crawlable intro from page.tsx, shown under
 * the home screen whether or not the player is logged in. */
export default function GameApp({ intro }: { intro: ReactNode }) {
  const { user } = useAuth();
  const { screen, reset } = useScreen();

  // Sign-in screens are the guest app's — a signed-in stack left on one
  // (right after logging in) lands on home.
  const preAuth = PRE_AUTH_SCREENS.includes(screen.name);
  useEffect(() => {
    if (user && preAuth) reset();
  }, [user, preAuth, reset]);

  if (!user) return <PublicApp intro={intro} />;
  if (preAuth) return <Loader label="Loading…" />;
  return <AppShell intro={intro} />;
}
