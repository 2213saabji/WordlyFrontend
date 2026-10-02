"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { TierNumber } from "@/types";

export type PlayMode = "daily" | "infinite";

export type Screen =
  // pre-auth — shown when logged out
  | { name: "login" }
  | { name: "signup" }
  | { name: "forgot-password" }
  // post-auth — the app itself
  | { name: "home" }
  | { name: "infinite-hub" } // Infinite mode's home: tier status + today's progress
  | { name: "how-tiers" } // the tier ladder and rules
  | { name: "tier-history" } // every tier move + completed Diamond cycles
  | { name: "diamond" } // Tier 1 cycle: Diamond stars and completed cycles
  | { name: "coins" } // wallet: balance, coin pack, activity
  | { name: "notifications" } // mobile: full-screen list (desktop uses the Nav dropdown)
  | { name: "play"; mode: PlayMode }
  | { name: "history" }
  | { name: "groups" }
  | { name: "leaderboard"; groupId?: string } // groupId omitted = Global leaderboard
  | { name: "tier-leaderboard"; tier?: TierNumber }; // tier omitted = the caller's own

export const POST_AUTH_SCREENS: Screen["name"][] = ["home", "infinite-hub", "how-tiers", "tier-history", "diamond", "coins", "notifications", "play", "history", "groups", "leaderboard", "tier-leaderboard"];

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
