import type { ReactNode } from "react";

const PREVIEW_ROWS: { letter: string; theme: "correct" | "present" | "absent" }[][] = [
  [
    { letter: "P", theme: "absent" },
    { letter: "L", theme: "present" },
    { letter: "A", theme: "correct" },
    { letter: "Y", theme: "correct" },
    { letter: "S", theme: "absent" },
  ],
  [
    { letter: "G", theme: "correct" },
    { letter: "U", theme: "correct" },
    { letter: "E", theme: "correct" },
    { letter: "S", theme: "correct" },
    { letter: "S", theme: "correct" },
  ],
];

const THEME_BG: Record<string, string> = {
  correct: "bg-correct border-correct",
  present: "bg-present border-present",
  absent: "bg-white/10 border-white/25",
};

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-4xl flex-1 overflow-hidden md:grid-cols-2 md:rounded-2xl md:my-8 md:border md:border-border md:shadow-xl md:shadow-black/5">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-accent to-accent-2 p-8 text-white md:flex">
        <div
          className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 animate-float rounded-full bg-white/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 animate-float-slow rounded-full bg-black/10 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 animate-fade-in-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">Wordly</p>
          <h2 className="mt-2 text-3xl font-extrabold leading-tight">{title}</h2>
          <p className="mt-3 max-w-xs text-sm text-white/80">{subtitle}</p>
        </div>

        <div className="relative z-10 flex flex-col gap-1.5">
          {PREVIEW_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="flex animate-fade-in-up gap-1.5"
              style={{ animationDelay: `${300 + rowIndex * 150}ms` }}
            >
              {row.map((tile, i) => (
                <div
                  key={i}
                  style={{ animationDelay: `${450 + rowIndex * 150 + i * 80}ms` }}
                  className={`flex h-10 w-10 animate-pop items-center justify-center rounded-md border-2 text-lg font-bold ${THEME_BG[tile.theme]}`}
                >
                  {tile.letter}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center gap-6 bg-background px-4 py-12 md:p-10">
        <div className="mx-auto w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 flex flex-col items-center gap-3 text-center md:hidden">
            <div className="flex gap-1">
              {PREVIEW_ROWS[1].map((tile, i) => (
                <div
                  key={i}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className={`flex h-8 w-8 animate-pop items-center justify-center rounded-md border-2 text-sm font-bold text-white ${THEME_BG[tile.theme]}`}
                >
                  {tile.letter}
                </div>
              ))}
            </div>
            <p className="text-sm text-foreground/60">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
