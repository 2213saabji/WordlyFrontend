"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LOGO_TILES = [
  { char: "G", className: "bg-accent text-background" },
  { char: "U", className: "bg-white/7 text-foreground" },
  { char: "E", className: "bg-white/7 text-foreground" },
  { char: "S", className: "bg-white/7 text-foreground" },
  { char: "S", className: "bg-white/7 text-foreground" },
  { char: "W", className: "bg-accent-2 text-background" },
  { char: "O", className: "bg-white/7 text-foreground" },
  { char: "R", className: "bg-white/7 text-foreground" },
  { char: "D", className: "bg-white/7 text-foreground" },
];

const NAV_LINKS = [
  { href: "/how-to-play", label: "How to play" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4.5 w-4.5">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4.5 w-4.5">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/** Header for the public info pages (how-to-play, about, faq, contact,
 * privacy-policy, terms) — deliberately separate from the game's own Nav
 * (Play/Groups/Leaderboard/History): these links are between info pages,
 * not game screens, and don't need auth state at all. */
export default function InfoHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-white/8">
      <div className="flex items-center gap-6 px-5 py-5 md:gap-6 md:px-14 md:py-5">
        <Link href="/" className="flex flex-none gap-1" aria-label="GuessWord home">
          {LOGO_TILES.map((tile, i) => (
            <span
              key={i}
              className={`flex h-6.5 w-6.5 items-center justify-center rounded-[7px] text-[13px] font-semibold ${tile.className}`}
            >
              {tile.char}
            </span>
          ))}
        </Link>

        <nav className="ml-4.5 hidden items-center gap-6.5 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap pb-0.75 text-[14.5px] ${
                  active
                    ? "border-b-2 border-accent font-semibold text-foreground"
                    : "border-b-2 border-transparent font-normal text-foreground/55 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/"
            className="hidden whitespace-nowrap rounded-xl bg-accent px-4 py-2.5 text-[13.5px] font-bold text-background transition-transform duration-150 hover:-translate-y-0.5 md:inline-flex"
          >
            Play today&apos;s word
          </Link>
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/7 text-foreground md:hidden"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-white/8 px-5 py-3 md:hidden">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-2.5 py-2.5 text-[15px] ${
                  active ? "bg-white/7 font-semibold text-foreground" : "font-normal text-foreground/55"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="mt-1.5 rounded-xl bg-accent px-4 py-3 text-center text-[14px] font-bold text-background"
          >
            Play today&apos;s word
          </Link>
        </nav>
      )}
    </header>
  );
}
