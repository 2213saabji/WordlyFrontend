"use client";

import { useCallback, useEffect, useState } from "react";
import WordlyBoard from "@/components/WordlyBoard";
import Keyboard from "@/components/Keyboard";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import {
  getInfiniteCurrent,
  getTodayGame,
  startNewInfiniteRound,
  submitGuess,
  submitInfiniteGuess,
  ApiRequestError,
} from "@/lib/api";
import ShareModal from "@/components/ShareModal";
import { useAuth } from "@/lib/auth-context";
import { isKnownGuess } from "@/lib/word-check";
import { wordNumberForDate } from "@/lib/share";
import type { PlayMode } from "@/lib/screen-context";
import type { Game, User } from "@/types";

const WORD_LENGTH = 5;

function formatCountdownToNextUtcMidnight(): string {
  const now = Date.now();
  const d = new Date(now);
  const nextMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const minutesLeft = Math.max(0, Math.round((nextMidnight - now) / 60_000));
  return `${String(Math.floor(minutesLeft / 60)).padStart(2, "0")}:${String(minutesLeft % 60).padStart(2, "0")}`;
}

function useCountdownToNextUtcMidnight(): string {
  const [label, setLabel] = useState(formatCountdownToNextUtcMidnight);
  useEffect(() => {
    const id = setInterval(() => setLabel(formatCountdownToNextUtcMidnight()), 30_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

function DailyWinCard({
  game,
  user,
  onOpenLeaderboard,
  onClose,
}: {
  game: Game;
  user: User;
  onOpenLeaderboard: (groupId?: string) => void;
  onClose: () => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const countdown = useCountdownToNextUtcMidnight();
  const wordNumber = wordNumberForDate(game.date);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${game.date}T00:00:00Z`));

  function handleLeaderboard() {
    const first = user.groups[0];
    onOpenLeaderboard(typeof first === "string" ? first : first?._id);
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-y-auto bg-background/95 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl animate-fade-in-up rounded-[26px] border border-correct/30 bg-correct/10 p-7.5 shadow-sm shadow-correct/10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4.5 w-4.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-start gap-5">
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-correct">
              Solved in {game.guesses.length} of 6
            </span>
            <span className="text-[44px] font-bold uppercase leading-none tracking-[0.08em]">{game.word}</span>
            <span className="text-sm text-foreground/60">
              Word no. {wordNumber} · {formattedDate}
            </span>
          </div>
          <span className="ml-auto flex flex-none flex-col items-center gap-1 rounded-[20px] bg-accent/15 px-5 py-4">
            <span className="text-3xl font-bold leading-none text-accent">{user.stats.currentStreak}</span>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-accent">Day streak</span>
          </span>
        </div>

        <div className="mt-5.5 grid grid-cols-3 gap-4 border-t border-foreground/10 pt-5">
          <span className="flex flex-col gap-1">
            <span className="text-[26px] font-light tracking-[-0.02em]">
              {user.stats.gamesWon}/{user.stats.gamesPlayed}
            </span>
            <span className="text-xs text-foreground/60">Wins</span>
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[26px] font-light tracking-[-0.02em]">{user.stats.maxStreak}</span>
            <span className="text-xs text-foreground/60">Best streak</span>
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[26px] font-light tabular-nums tracking-[-0.02em]">{countdown}</span>
            <span className="text-xs text-foreground/60">Until next word</span>
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-accent px-6 py-3.75 text-sm font-bold text-background shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              className="h-4.5 w-4.5"
            >
              <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M12 3v13M8 7l4-4 4 4" />
            </svg>
            Share result
          </button>
          <button
            type="button"
            onClick={handleLeaderboard}
            className="whitespace-nowrap rounded-2xl border border-border bg-surface px-6 py-3.75 text-sm font-semibold transition-colors hover:bg-border"
          >
            Group leaderboard
          </button>
        </div>
      </div>

      {shareOpen && (
        <ShareModal game={game} user={user} wordNumber={wordNumber} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

export default function PlayScreen({
  mode,
  onBack,
  onOpenLeaderboard,
}: {
  mode: PlayMode;
  onBack: () => void;
  onOpenLeaderboard: (groupId?: string) => void;
}) {
  const { user, refreshUser } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [winCardDismissed, setWinCardDismissed] = useState(false);

  useEffect(() => {
    const fetchCurrent = mode === "daily" ? getTodayGame : getInfiniteCurrent;
    fetchCurrent()
      .then(({ game }) => setGame(game))
      .finally(() => setLoading(false));
  }, [mode]);

  const handleNextWord = useCallback(async () => {
    // Also doubles as "skip this round" while one is still in progress —
    // /infinite/new abandons whatever's active and hands back a fresh round.
    try {
      const { game } = await startNewInfiniteRound();
      setGame(game);
      setCurrentGuess("");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    }
  }, []);

  const handleSubmitGuess = useCallback(async () => {
    if (submitting) return;
    if (currentGuess.length !== WORD_LENGTH) {
      setShakeSignal((n) => n + 1);
      return;
    }

    // Client-side pre-check against the hashed word lists — guess validation
    // isn't mode-scoped (matches the backend's shared VALID_GUESS_SET), so
    // this only skips the backend call for a guess that's unrecognized in
    // *all three* word lists (definitely not a word). Anything the local
    // check can't rule out still goes to the backend, which remains the
    // final authority.
    const known = await isKnownGuess(currentGuess, mode);
    if (!known) {
      setShakeSignal((n) => n + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const submit = mode === "daily" ? submitGuess : submitInfiniteGuess;
      const { game } = await submit(currentGuess);
      setGame(game);
      setCurrentGuess("");
      // Infinite rounds never touch stats/streaks — only refresh the daily
      // streak/wins display when a daily game actually finishes.
      if (mode === "daily" && game.status !== "in-progress") {
        refreshUser();
      }
    } catch (err) {
      setShakeSignal((n) => n + 1);
      if (err instanceof ApiRequestError) {
        // A rejected guess (too short, not a real word, etc.) is a normal
        // part of play — the shake is the feedback, no need to also show text.
        if (err.data?.game) setGame(err.data.game);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  }, [mode, currentGuess, submitting, refreshUser]);

  const handleKey = useCallback(
    (key: string) => {
      if (!game || game.status !== "in-progress" || submitting) return;
      setError(null);

      if (key === "Enter") {
        handleSubmitGuess();
        return;
      }
      if (key === "Backspace") {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }
      if (/^[a-z]$/i.test(key) && currentGuess.length < WORD_LENGTH) {
        setCurrentGuess((g) => (g + key).toLowerCase());
      }
    },
    [game, submitting, currentGuess, handleSubmitGuess],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter" || e.key === "Backspace" || /^[a-z]$/i.test(e.key)) {
        // Stop the browser from also activating whatever happens to be
        // focused (an on-screen key, a nav link) — this page's keys always
        // go to the board, no matter what focus drifted to.
        e.preventDefault();
      }
      handleKey(e.key);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  if (loading || !game) {
    return <Loader label={mode === "daily" ? "Loading today's game…" : "Loading a fresh word…"} />;
  }

  const finished = game.status !== "in-progress";
  const won = game.status === "won";

  return (
    <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-6 px-4 py-4">
      <div className="flex w-full items-center justify-between gap-3">
        <ScreenHeader title={mode === "daily" ? "Play Daily" : "Infinite"} onBack={onBack} />
        {mode === "infinite" && !finished && (
          <button
            type="button"
            onClick={handleNextWord}
            className="whitespace-nowrap text-xs font-semibold text-foreground/50 transition-colors hover:text-accent"
          >
            New word
          </button>
        )}
        {mode === "daily" && finished && won && winCardDismissed && (
          <button
            type="button"
            onClick={() => setWinCardDismissed(false)}
            aria-label="Show today's result"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent/15 text-accent transition-colors hover:bg-accent/25"
          >
            🏆
          </button>
        )}
      </div>

      {finished && won && mode === "daily" && user ? (
        !winCardDismissed && (
          <DailyWinCard
            game={game}
            user={user}
            onOpenLeaderboard={onOpenLeaderboard}
            onClose={() => setWinCardDismissed(true)}
          />
        )
      ) : (
        finished && (
          <div
            className={`w-full max-w-xl animate-fade-in-up rounded-xl border p-4 text-center shadow-sm ${
              won ? "border-correct/40 bg-correct/10 shadow-correct/10" : "border-border bg-surface"
            }`}
          >
            <p className="text-lg font-bold">
              {won ? (
                <>
                  You won! <span className="inline-block animate-tile-bounce">🎉</span>
                </>
              ) : mode === "daily" ? (
                "Better luck tomorrow"
              ) : (
                "Out of guesses"
              )}
            </p>
            {game.word && (
              <p className="text-sm text-foreground/70">
                The word was <span className="font-semibold uppercase">{game.word}</span>
              </p>
            )}
            {mode === "daily" && user && (
              <p className="mt-2 text-xs text-foreground/50">
                Streak: {user.stats.currentStreak} · Wins: {user.stats.gamesWon}/
                {user.stats.gamesPlayed}
              </p>
            )}
            {mode === "infinite" && (
              <button
                type="button"
                onClick={handleNextWord}
                className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
              >
                Next word
              </button>
            )}
          </div>
        )
      )}

      {error && (
        <p key={shakeSignal} className="animate-fade-in text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <WordlyBoard
        guesses={game.guesses}
        currentGuess={currentGuess}
        shakeSignal={shakeSignal}
        celebrate={won}
      />

      <Keyboard guesses={game.guesses} onKey={handleKey} disabled={finished || submitting} />
    </div>
  );
}
