import type { Guess, LetterResult } from "@/types";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function letterStatuses(guesses: Guess[]): Record<string, LetterResult> {
  const status: Record<string, LetterResult> = {};
  for (const { guess, result } of guesses) {
    guess.split("").forEach((letter, i) => {
      const value = result[i];
      const current = status[letter];
      // correct beats present beats absent
      if (current === 1) return;
      if (current === -1 && value !== 1) return;
      status[letter] = value;
    });
  }
  return status;
}

function keyClasses(status: LetterResult | undefined) {
  if (status === 1) return "bg-correct text-white shadow-sm shadow-correct/30";
  if (status === -1) return "bg-present text-background shadow-sm shadow-present/30";
  // Tried and not in the word — dulled down so it visually reads as "used up",
  // distinct from an untried key.
  if (status === 0) return "bg-white/5 text-foreground/35";
  return "bg-white/10 text-foreground";
}

export default function Keyboard({
  guesses,
  onKey,
  disabled,
}: {
  guesses: Guess[];
  onKey: (key: string) => void;
  disabled?: boolean;
}) {
  const status = letterStatuses(guesses);

  return (
    <div
      className="mx-auto flex w-full max-w-lg animate-fade-in-up flex-col gap-1.5"
      style={{ animationDelay: "150ms" }}
    >
      {ROWS.map((row, rowIndex) => (
        // A shared 20-column grid, not flex-1, keeps every key the exact same
        // width whether its row has 7, 9, or 10 keys (and, unlike a fixed px
        // width, it scales with the container instead of overflowing it).
        <div key={rowIndex} className="grid grid-cols-20 gap-1.5">
          {rowIndex === 2 && (
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKey("Enter")}
              className="col-span-3 flex h-11 items-center justify-center rounded-[10px] bg-accent text-xs font-bold uppercase tracking-wide text-background transition-all duration-150 hover:brightness-105 active:scale-90 disabled:opacity-50 disabled:active:scale-100"
            >
              Enter
            </button>
          )}
          {row.split("").map((letter, i) => (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKey(letter)}
              className={`col-span-2 flex h-11 items-center justify-center rounded-[10px] text-sm font-semibold uppercase transition-all duration-150 ease-out active:scale-90 disabled:opacity-50 disabled:active:scale-100 ${
                // Row 2 (asdfghjkl) only fills 18 of 20 columns — shift its
                // first key over by one to center the whole row.
                rowIndex === 1 && i === 0 ? "col-start-2 " : ""
              }${keyClasses(status[letter])}`}
            >
              {letter}
            </button>
          ))}
          {rowIndex === 2 && (
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKey("Backspace")}
              className="col-span-3 flex h-11 items-center justify-center rounded-[10px] bg-white/14 text-xs font-semibold uppercase text-foreground transition-all duration-150 hover:bg-white/20 active:scale-90 disabled:opacity-50 disabled:active:scale-100"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
