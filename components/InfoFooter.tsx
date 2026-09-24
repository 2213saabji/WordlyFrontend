import Link from "next/link";
import packageJson from "@/package.json";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Game",
    links: [
      { href: "/how-to-play", label: "How to play" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "GuessWord",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy policy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export default function InfoFooter() {
  return (
    <footer className="border-t border-white/8 px-5 py-10 md:px-14">
      <div className="flex flex-wrap gap-8 md:gap-14">
        <div className="flex flex-1 flex-col gap-3 basis-55">
          <span className="text-[15px] font-semibold">GuessWord</span>
          <span className="max-w-65 text-[13.5px] leading-relaxed text-[#9a8aa2]">
            Five letters, six tries, a new word every day.
          </span>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.heading} className="flex min-w-30 flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a8aa2]">{col.heading}</span>
            {col.links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-[#c9bfcc] hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        ))}

        <div className="flex basis-full justify-between border-t border-white/6 pt-5.5 text-[12.5px] text-[#9a8aa2]">
          <span>© {new Date().getFullYear()} GuessWord</span>
          <span>v{packageJson.version}</span>
        </div>
      </div>
    </footer>
  );
}
