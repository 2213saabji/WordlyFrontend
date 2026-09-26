"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useScreen, type Screen } from "@/lib/screen-context";
import EditNameModal from "@/components/EditNameModal";
import { TierChip } from "@/components/TierBadge";
import { NotificationBell } from "@/components/Notifications";
import { INFINITE_TIERS_ENABLED } from "@/lib/flags";

const LOGO_TILES = [
  { char: "G", className: "bg-accent text-background" },
  { char: "U", className: "bg-white/10" },
  { char: "E", className: "bg-white/10" },
  { char: "S", className: "bg-white/10" },
  { char: "S", className: "bg-white/10" },
  { char: "W", className: "bg-accent-2 text-background" },
  { char: "O", className: "bg-white/10" },
  { char: "R", className: "bg-white/10" },
  { char: "D", className: "bg-white/10" },
];

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function BurgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

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
    isActive: (s) =>
      (s.name === "leaderboard" && !s.groupId) || s.name === "tier-leaderboard" || s.name === "how-tiers",
  },
  {
    label: "History",
    screen: { name: "history" },
    isActive: (s) => s.name === "history" || s.name === "tier-history",
  },
];

export default function Nav() {
  const { user, logout, loading } = useAuth();
  const { screen, push, reset } = useScreen();
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    reset({ name: "login" });
  };

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

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
                className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold text-foreground transition-transform duration-300 ease-out group-hover:-translate-y-1 ${tile.className}`}
              >
                {tile.char}
              </span>
            ))}
          </span>
        </Link>

        {user && (
          <nav className="hidden animate-fade-in items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              const active = link.isActive(screen);
              return (
                // A real Link (not just push()) because these might be
                // clicked from a standalone route like /faq or /about,
                // which don't read screen-context at all.
                <Link
                  key={link.label}
                  href="/"
                  onClick={() => push(link.screen)}
                  className={`text-[14.5px] font-medium transition-colors duration-150 ${
                    active
                      ? "border-b-2 border-accent pb-0.5 text-foreground"
                      : "text-foreground/55 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              {INFINITE_TIERS_ENABLED && (
                <NotificationBell
                  onNavigate={push}
                  onOpenScreen={() => push({ name: "notifications" })}
                />
              )}
              <span className="hidden animate-fade-in items-center gap-3 sm:flex">
                {/* Infinite tier badge — only once /auth/me reports a tier
                    (after the player's first completed Infinite game). */}
                {INFINITE_TIERS_ENABLED && user.infinite && (
                  <Link
                    href="/"
                    onClick={() => push({ name: "infinite-hub" })}
                    title="Your Infinite tier"
                    className="rounded-full transition-opacity duration-150 hover:opacity-80"
                  >
                    <TierChip tier={user.infinite.tier} name={user.infinite.tierName} round />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setEditNameOpen(true)}
                  title="Edit your name"
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${
                    user.stats.currentStreak > 0
                      ? "bg-accent/12 text-accent hover:bg-accent/20"
                      : "bg-white/8 text-foreground/60 hover:bg-white/14"
                  }`}
                >
                  {user.username} · {user.stats.currentStreak} streak
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-md border border-border px-2.5 py-1.5 text-foreground/70 transition-all duration-150 hover:border-danger/40 hover:bg-danger/10 hover:text-danger active:scale-95"
                >
                  Log out
                </button>
              </span>

              <div ref={mobileMenuRef} className="relative animate-fade-in sm:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={mobileMenuOpen}
                  className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <BurgerIcon />
                </button>

                <div
                  className={`absolute right-0 top-[calc(100%+10px)] w-56 origin-top rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur-md transition-all duration-500 ease-out ${
                    mobileMenuOpen
                      ? "pointer-events-auto translate-y-0 scale-y-100 opacity-100"
                      : "pointer-events-none -translate-y-3 scale-y-90 opacity-0"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-foreground/80 transition-colors hover:bg-white/8"
                  >
                    <span className="flex items-center gap-2">
                      <PencilIcon />
                      {user.username}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${
                        user.stats.currentStreak > 0 ? "bg-accent/15 text-accent" : "bg-white/8 text-foreground/50"
                      }`}
                    >
                      {user.stats.currentStreak} streak
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-foreground/70 transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <LogoutIcon />
                    Log out
                  </button>
                </div>
              </div>
            </>
          ) : !loading ? (
            // Hidden on mobile — signed-out visitors already land on the login
            // screen, which links to sign up, so the header stays uncluttered.
            <span className="hidden animate-fade-in items-center gap-3 sm:flex">
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
            </span>
          ) : null}
        </div>
      </div>

      {editNameOpen && user && <EditNameModal onClose={() => setEditNameOpen(false)} />}
    </header>
  );
}
