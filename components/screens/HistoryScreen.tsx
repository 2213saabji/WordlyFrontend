"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import { getHistory, getInfiniteHistory } from "@/lib/api";
import type { Game } from "@/types";

type Mode = "daily" | "infinite";

const MODE_OPTIONS: { key: Mode; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "infinite", label: "Infinite" },
];

function resultEmoji(value: number) {
  if (value === 1) return "🟩";
  if (value === -1) return "🟨";
  return "⬛";
}

function statusLabel(status: Game["status"]) {
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  if (status === "abandoned") return "Skipped";
  return "In progress";
}

function statusBorder(status: Game["status"]) {
  if (status === "won") return "border-l-correct";
  if (status === "lost") return "border-l-danger";
  if (status === "abandoned") return "border-l-present";
  return "border-l-border";
}

export default function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<Mode>("daily");
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    async function load() {
      setGames(null);
      const fetchHistory = mode === "daily" ? getHistory : getInfiniteHistory;
      const { games } = await fetchHistory();
      setGames(games);
    }
    load();
  }, [mode]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <ScreenHeader title="History" onBack={onBack} />
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMode(opt.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                mode === opt.key ? "bg-accent text-background" : "text-foreground/65 hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {!games ? (
        <Loader label="Loading history…" />
      ) : games.length === 0 ? (
        <div className="flex flex-1 animate-fade-in items-center justify-center text-sm text-foreground/60">
          {mode === "daily" ? "No games played yet." : "No infinite rounds played yet."}
        </div>
      ) : (
        games.map((game, i) => (
          <div
            key={`${game.date}-${i}`}
            style={{ animationDelay: `${i * 50}ms` }}
            className={`flex animate-fade-in-up items-center justify-between gap-4 rounded-xl border border-l-4 border-border bg-surface p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${statusBorder(game.status)}`}
          >
            <div>
              <p className="text-sm font-medium">{game.date}</p>
              <p className="text-xs text-foreground/60">
                {statusLabel(game.status)}
                {game.word && <> · word: {game.word.toUpperCase()}</>} ·{" "}
                {game.attemptsUsed}/6 guesses
              </p>
            </div>
            <div className="flex flex-col gap-0.5 text-xs leading-none">
              {game.guesses.map((g, gi) => (
                <div key={gi}>{g.result.map(resultEmoji).join("")}</div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
