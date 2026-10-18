"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useScreen, type Screen } from "@/lib/screen-context";
import EditNameModal from "@/components/EditNameModal";
import CoinChip from "@/components/CoinChip";
import { TierChip } from "@/components/TierBadge";
import { NotificationBell } from "@/components/Notifications";

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

function StreakIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, no optimisation needed
    <img src="/icons/streak-fire.svg" alt="" aria-hidden="true" className="h-4 w-4 flex-none" />
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

// Signed out: real links to the public pages, so every page — the guest
// game on "/" included — has the same site navigation (and crawlers find
// them in the server HTML).
const GUEST_LINKS = [
  { href: "/how-to-play", label: "How to play" },
  { href: "/guides", label: "Guides" },
  { href: "/leaderboard/infinite", label: "Leaderboard" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
];

export default function Nav() {
  const { user, logout, loading } = useAuth();
  const { screen, push, reset } = useScreen();
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isGuestLinkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // "/" swaps to the guest home by itself.
  const handleLogout = () => {
    logout();
    reset();
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-8 px-4 py-3 md:px-8 md:py-4">
        {/* The href covers the other routes (/leaderboard/infinite,
            /reset-password/[token], ...); the reset() call is what actually
            matters when already on it. */}
        <Link
          href="/"
          onClick={() => reset()}
          data-tour="tour-back"
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
                // clicked from another route like /leaderboard/infinite.
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

        {/* .auth-pending: hidden for a returning player with a cached
            session until hydration (see app/layout.tsx) — they get the
            signed-in header instead. */}
        {!user && (
          <nav
            aria-label="Site"
            className={`hidden items-center gap-7 lg:flex ${loading ? "auth-pending" : "animate-fade-in"}`}
          >
            {GUEST_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-[14.5px] font-medium transition-colors duration-150 ${
                  isGuestLinkActive(link.href)
                    ? "border-b-2 border-accent pb-0.5 text-foreground"
                    : "text-foreground/55 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <NotificationBell onNavigate={push} onOpenScreen={() => push({ name: "notifications" })} />
              <span className="hidden animate-fade-in items-center gap-3 sm:flex">
                <CoinChip />
                {/* Infinite tier badge — only once /auth/me reports a tier
                    (after the player's first completed Infinite game). */}
                {user.infinite && (
                  <Link
                    href="/"
                    onClick={() => push({ name: "infinite-hub" })}
                    title="Your Infinite tier"
                    className="rounded-full transition-opacity duration-150 hover:opacity-80"
                  >
                    <TierChip tier={user.infinite.tier} name={user.infinite.tierName} round />
                  </Link>
                )}
                {/* The name and Log out live in the menu below. */}
                <span
                  title="Your daily streak"
                  className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                    user.stats.currentStreak > 0 ? "bg-accent/12 text-accent" : "bg-white/8 text-foreground/60"
                  }`}
                >
                  <StreakIcon />
                  {user.stats.currentStreak} streak
                </span>
              </span>

              {/* Account menu, every screen size: the name (tap to edit) and
                  Log out. */}
              <div ref={menuRef} className="relative animate-fade-in">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                  className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <BurgerIcon />
                </button>

                <div
                  className={`absolute right-0 top-[calc(100%+10px)] w-fit origin-top rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur-md transition-all duration-500 ease-out min-w-44 ${
                    menuOpen
                      ? "pointer-events-auto translate-y-0 scale-y-100 opacity-100"
                      : "pointer-events-none -translate-y-3 scale-y-90 opacity-0"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-foreground/80 transition-colors hover:bg-white/8"
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <PencilIcon />
                      {user.username}
                    </span>
                    {/* Mobile only — the web header shows the streak itself. */}
                    <span
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-bold sm:hidden ${
                        user.stats.currentStreak > 0 ? "bg-accent/15 text-accent" : "bg-white/8 text-foreground/50"
                      }`}
                    >
                      <StreakIcon />
                      {user.stats.currentStreak} streak
                    </span>
                  </button>
                  <Link
                    href="/"
                    onClick={() => {
                      push({ name: "settings" });
                      setMenuOpen(false);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-foreground/70 transition-colors hover:bg-white/8 hover:text-foreground"
                  >
                    <SettingsIcon />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-foreground/70 transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <LogoutIcon />
                    Log out
                  </button>
                </div>
              </div>
            </>
          ) : (
            // The only way into the (optional) sign-in screens besides the
            // login-only actions, so shown on every screen size. Signed-out
            // copy says "Log in" everywhere; new players reach signup from
            // the login screen's "No account? Sign up".
            <span className={`flex items-center gap-2.5 ${loading ? "auth-pending" : "animate-fade-in"}`}>
              <Link
                href="/"
                onClick={() => reset({ name: "login" })}
                className="whitespace-nowrap rounded-md bg-accent px-3 py-1.5 font-medium text-white shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:shadow-accent/40 active:translate-y-0 active:scale-95"
              >
                Log in
              </Link>

              {/* Below lg the site links move into this menu. */}
              <div ref={menuRef} className="relative lg:hidden">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                  className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-md border border-border text-foreground/70 transition-colors hover:border-accent/40 hover:text-accent"
                >
                  <BurgerIcon />
                </button>

                <nav
                  aria-label="Site"
                  className={`absolute right-0 top-[calc(100%+10px)] flex w-44 origin-top flex-col rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur-md transition-all duration-500 ease-out ${
                    menuOpen
                      ? "pointer-events-auto visible translate-y-0 scale-y-100 opacity-100"
                      : "pointer-events-none invisible -translate-y-3 scale-y-90 opacity-0"
                  }`}
                >
                  {GUEST_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-colors hover:bg-white/8 ${
                        isGuestLinkActive(link.href) ? "bg-white/7 text-foreground" : "text-foreground/75"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </span>
          )}
        </div>
      </div>

      {editNameOpen && user && <EditNameModal onClose={() => setEditNameOpen(false)} />}
    </header>
  );
}
