"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { TierNumber, VerificationStep } from "@/types";

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
  | { name: "diamond" } // Tier 1 cycle: reward tracker (money) / stars
  | { name: "verify"; step?: VerificationStep } // MONEY: payout verification flow
  | { name: "notifications" } // mobile: full-screen list (desktop uses the Nav dropdown)
  | { name: "play"; mode: PlayMode }
  | { name: "history" }
  | { name: "groups" }
  | { name: "leaderboard"; groupId?: string } // groupId omitted = Global leaderboard
  | { name: "tier-leaderboard"; tier?: TierNumber }; // tier omitted = the caller's own

export const POST_AUTH_SCREENS: Screen["name"][] = ["home", "infinite-hub", "how-tiers", "tier-history", "diamond", "verify", "notifications", "play", "history", "groups", "leaderboard", "tier-leaderboard"];

interface ScreenContextValue {
  screen: Screen;
  push: (screen: Screen) => void;
  back: () => void;
  reset: (screen?: Screen) => void;
  replace: (screen: Screen) => void;
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
