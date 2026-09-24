import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/how-to-play", label: "How to Play" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/80 px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3.5 text-center md:flex-row md:justify-between md:text-left">
        <span className="text-sm font-semibold tracking-tight text-foreground/80">GuessWord</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-foreground/55 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span className="text-xs text-foreground/40">© {new Date().getFullYear()} GuessWord</span>
      </div>
    </footer>
  );
}
