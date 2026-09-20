"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type PlayMode = "daily" | "infinite";

export type Screen =
  // pre-auth — shown when logged out
  | { name: "login" }
  | { name: "signup" }
  | { name: "forgot-password" }
  // post-auth — the app itself
  | { name: "home" }
  | { name: "play"; mode: PlayMode }
  | { name: "history" }
  | { name: "groups" }
  | { name: "leaderboard"; groupId?: string }; // groupId omitted = Global leaderboard

export const POST_AUTH_SCREENS: Screen["name"][] = ["home", "play", "history", "groups", "leaderboard"];

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
