"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useScreen, type Screen } from "@/lib/screen-context";

const LOGO_TILES = [
  { char: "W", className: "bg-accent text-background" },
  { char: "O", className: "bg-white/10" },
  { char: "R", className: "bg-white/10" },
  { char: "D", className: "bg-accent-2 text-background" },
  { char: "L", className: "bg-white/10" },
  { char: "Y", className: "bg-white/10" },
];

const NAV_LINKS: { label: string; screen: Screen; isActive: (s: Screen) => boolean }[] = [
  { label: "Play", screen: { name: "play", mode: "daily" }, isActive: (s) => s.name === "play" },
  {
    label: "Groups",
    screen: { name: "groups" },
    isActive: (s) => s.name === "groups" || (s.name === "leaderboard" && !!s.groupId),
  },
  {
    label: "Leaderboard",
    screen: { name: "leaderboard" },
    isActive: (s) => s.name === "leaderboard" && !s.groupId,
  },
  { label: "History", screen: { name: "history" }, isActive: (s) => s.name === "history" },
];

export default function Nav() {
  const { user, logout, loading } = useAuth();
  const { screen, push, reset } = useScreen();

  const handleLogout = () => {
    logout();
    reset({ name: "login" });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-8 px-4 py-3 md:px-8 md:py-4">
        {/* href="/" covers the one real other route (/reset-password/[token]);
            the reset() call is what actually matters when already on "/". */}
        <Link
          href="/"
          onClick={() => reset(user ? { name: "home" } : { name: "login" })}
          className="group flex shrink-0 items-center gap-2"
        >
          <span className="flex gap-0.5">
            {LOGO_TILES.map((tile, i) => (
              <span
                key={i}
                style={{ transitionDelay: `${i * 40}ms` }}
                className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-foreground transition-transform duration-300 ease-out group-hover:-translate-y-1 ${tile.className}`}
              >
                {tile.char}
              </span>
            ))}
          </span>
        </Link>

        {user && (
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              const active = link.isActive(screen);
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => push(link.screen)}
                  className={`text-[14.5px] font-medium transition-colors duration-150 ${
                    active
                      ? "border-b-2 border-accent pb-0.5 text-foreground"
                      : "text-foreground/55 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5 text-[13px] font-semibold text-accent sm:inline-flex">
                {user.username} · <span className="animate-pulse">🔥</span>
                {user.stats.currentStreak}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-border px-2.5 py-1.5 text-foreground/70 transition-all duration-150 hover:border-danger/40 hover:bg-danger/10 hover:text-danger active:scale-95"
              >
                Log out
              </button>
            </>
          ) : !loading ? (
            <>
              <Link
                href="/"
                onClick={() => reset({ name: "login" })}
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                href="/"
                onClick={() => reset({ name: "signup" })}
                className="rounded-md bg-accent px-3 py-1.5 font-medium text-white shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/40 active:translate-y-0 active:scale-95"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
