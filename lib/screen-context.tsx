"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { TierNumber } from "@/types";

export type PlayMode = "daily" | "infinite";

// One stack for both sides of "/" (GameApp): the guest app (PublicApp:
// guest home, guest Infinite and the sign-in screens) and the signed-in app.
// Each renders only its own screens.
export type Screen =
  // pre-auth — the guest app. `then` is where to land once signed in (e.g.
  // Play Daily from the guest home); omitted = home.
  | { name: "login"; then?: Screen }
  | { name: "signup"; then?: Screen }
  | { name: "forgot-password" }
  // post-auth — the signed-in app. For a guest, "home" is the guest home and
  // "play" (infinite) the guest board.
  | { name: "home" }
  | { name: "infinite-hub" } // Infinite mode's home: tier status + today's progress
  | { name: "how-tiers" } // the tier ladder and rules
  | { name: "tier-history" } // every tier move + completed Diamond cycles
  | { name: "diamond" } // Tier 1 cycle: Diamond stars and completed cycles
  | { name: "coins" } // wallet: balance, coin pack, activity
  | { name: "notifications" } // mobile: full-screen list (desktop uses the Nav dropdown)
  | { name: "settings" } // daily reminder and install
  | { name: "play"; mode: PlayMode }
  | { name: "history" }
  | { name: "groups" }
  | { name: "leaderboard"; groupId?: string } // groupId omitted = Global leaderboard
  | { name: "tier-leaderboard"; tier?: TierNumber }; // tier omitted = the caller's own

export const PRE_AUTH_SCREENS: Screen["name"][] = ["login", "signup", "forgot-password"];

export const POST_AUTH_SCREENS: Screen["name"][] =["home", "infinite-hub", "how-tiers", "tier-history", "diamond", "coins", "notifications", "settings", "play", "history", "groups", "leaderboard", "tier-leaderboard"];

interface ScreenContextValue {
  screen: Screen;
  push: (screen: Screen) => void;
  back: () => void;
  reset: (screen?: Screen) => void;
  replace: (screen: Screen) => void;
  /** Goes back to the most recent `screen` in the stack (by name), or — if
   * it isn't there — replaces the current screen with it. Never stacks a
   * duplicate, so its own Back still leads where it did. */
  backTo: (screen: Screen) => void;
}

const ScreenContext = createContext<ScreenContextValue | null>(null);

export function ScreenProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<Screen[]>([{ name: "home" }]);

  const value = useMemo<ScreenContextValue>(
    () => ({
      screen: stack[stack.length - 1],
      push: (screen) => setStack((prev) => [...prev, screen]),
      back: () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)),
      reset: (screen = { name: "home" }) => setStack([screen]),
      replace: (screen) => setStack((prev) => [...prev.slice(0, -1), screen]),
      backTo: (screen) =>
        setStack((prev) => {
          const at = prev.slice(0, -1).map((s) => s.name).lastIndexOf(screen.name);
          return at >= 0 ? prev.slice(0, at + 1) : [...prev.slice(0, -1), screen];
        }),
    }),
    [stack],
  );

  return <ScreenContext.Provider value={value}>{children}</ScreenContext.Provider>;
}

export function useScreen(): ScreenContextValue {
  const ctx = useContext(ScreenContext);
  if (!ctx) throw new Error("useScreen must be used within a ScreenProvider");
  return ctx;
}
