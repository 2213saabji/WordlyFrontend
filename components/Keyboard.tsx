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
  if (status === -1) return "bg-present text-white shadow-sm shadow-present/30";
  // Absent (0) and untried keys share the same #362b3f (--border) color.
  return "bg-border text-foreground";
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
    <div className="mx-auto flex w-full max-w-lg animate-fade-in-up flex-col gap-1.5" style={{ animationDelay: "150ms" }}>
      {ROWS.map((row, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-1.5">
          {rowIndex === 2 && (
            <button
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKey("Enter")}
              className="flex-[1.5] rounded-md bg-surface px-1 py-3 text-xs font-semibold uppercase text-foreground transition-all duration-150 hover:bg-border active:scale-90 disabled:opacity-50 disabled:active:scale-100"
            >
              Enter
            </button>
          )}
          {row.split("").map((letter) => (
            <button
              key={letter}
              type="button"
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onKey(letter)}
              className={`flex-1 rounded-md py-3 text-sm font-semibold uppercase transition-all duration-150 ease-out active:scale-90 disabled:opacity-50 disabled:active:scale-100 ${keyClasses(status[letter])}`}
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
              className="flex-[1.5] rounded-md bg-surface px-1 py-3 text-xs font-semibold uppercase text-foreground transition-all duration-150 hover:bg-border active:scale-90 disabled:opacity-50 disabled:active:scale-100"
            >
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
