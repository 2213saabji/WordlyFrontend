"use client";

import { useCallback, useEffect, useState } from "react";
import GuessWordBoard from "@/components/GuessWordBoard";
import Keyboard from "@/components/Keyboard";
import Loader from "@/components/Loader";
import {
  getGroupDailyLeaderboard,
  getInfiniteCurrent,
  getTodayGame,
  startNewInfiniteRound,
  submitGuess,
  submitInfiniteGuess,
  ApiRequestError,
} from "@/lib/api";
import ShareModal from "@/components/ShareModal";
import { useAuth } from "@/lib/auth-context";
import { readCache, writeCache } from "@/lib/cache";
import { isKnownGuess } from "@/lib/word-check";
import { wordNumberForDate } from "@/lib/share";
import type { PlayMode } from "@/lib/screen-context";
import type { Game, GameDifficulty, Guess, LetterResult, User } from "@/types";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
const GROUP_DAILY_CACHE_KEY = "play:group-daily";

/** Today's daily board is only valid until UTC midnight — reads of the
 * daily key pass `sameDay` so yesterday's board never flashes up. */
function gameCacheKey(mode: PlayMode): string {
  return `play:${mode}`;
}
// The hint stays locked until this many guesses have been submitted — it's
// a fallback for once you're stuck, not a shortcut from guess one.
const HINT_UNLOCK_ATTEMPT = 4;
const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];
const NUMBER_WORDS_FULL = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

function numberWord(n: number): string {
  return n >= 0 && n < NUMBER_WORDS_FULL.length ? NUMBER_WORDS_FULL[n] : String(n);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ordinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

type GroupDailyStats = {
  groupId: string;
  groupName: string;
  rank: number | null;
  total: number;
  wonCount: number;
};

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

function formatFullCountdownToNextUtcMidnight(): string {
  const now = Date.now();
  const d = new Date(now);
  const nextMidnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const secondsLeft = Math.max(0, Math.round((nextMidnight - now) / 1000));
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function useFullCountdownToNextUtcMidnight(): string {
  const [label, setLabel] = useState(formatFullCountdownToNextUtcMidnight);
  useEffect(() => {
    const id = setInterval(() => setLabel(formatFullCountdownToNextUtcMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  return label;
}

function formatDateEyebrow(dateKey: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

type KnownLetters = {
  correct: { letter: string; pos: number }[];
  present: string[];
  absent: string[];
};

function buildKnownLetters(guesses: Guess[]): KnownLetters {
  const status: Record<string, LetterResult> = {};
  const correctPos: Record<string, number> = {};
  for (const { guess, result } of guesses) {
    guess.split("").forEach((letter, i) => {
      const value = result[i];
      const current = status[letter];
      if (current === 1) return;
      if (current === -1 && value !== 1) return;
      status[letter] = value;
      if (value === 1) correctPos[letter] = i + 1;
    });
  }
  const correct: { letter: string; pos: number }[] = [];
  const present: string[] = [];
  const absent: string[] = [];
  for (const [letter, value] of Object.entries(status)) {
    if (value === 1) correct.push({ letter, pos: correctPos[letter] });
    else if (value === -1) present.push(letter);
    else absent.push(letter);
  }
  return { correct, present, absent };
}

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.75 w-3.75">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-3.5 w-3.5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="h-4.5 w-4.5">
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M12 3v13M8 7l4-4 4 4" />
    </svg>
  );
}

function LeaderboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

function HintIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3V16h5.8v-.8c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

const DIFFICULTY_LABEL: Record<GameDifficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFFICULTY_STYLE: Record<GameDifficulty, string> = {
  easy: "bg-correct/15 text-correct",
  medium: "bg-present/15 text-present",
  hard: "bg-danger/15 text-danger",
};

function DifficultyBadge({ difficulty }: { difficulty?: GameDifficulty }) {
  if (!difficulty) return null;
  return (
    <span
      className={`inline-flex flex-none items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${DIFFICULTY_STYLE[difficulty]}`}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

/** Hint text arrives with the game object itself (even mid-round) — this
 * just toggles showing it, no separate fetch. Stays locked (shows a lock
 * icon instead) until HINT_UNLOCK_ATTEMPT guesses are in. */
function HintButton({
  hint,
  unlocked,
  revealed,
  onToggle,
  onLockedClick,
}: {
  hint?: string;
  unlocked: boolean;
  revealed: boolean;
  onToggle: () => void;
  onLockedClick: () => void;
}) {
  if (!hint) return null;
  if (!unlocked) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        aria-label={`Hint unlocks after guess ${HINT_UNLOCK_ATTEMPT}`}
        title={`Hint unlocks after guess ${HINT_UNLOCK_ATTEMPT}`}
        className="flex h-5.5 w-5.5 flex-none items-center justify-center rounded-full bg-white/5 text-foreground/30 transition-colors hover:bg-white/9"
      >
        <HintIcon />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={revealed ? "Hide hint" : "Show hint"}
      title={revealed ? "Hide hint" : "Show hint"}
      className="flex h-5.5 w-5.5 flex-none items-center justify-center rounded-full bg-white/8 text-foreground/60 transition-colors hover:bg-white/14 hover:text-accent"
    >
      <HintIcon />
    </button>
  );
}

/** Animates its own height (via a grid-template-rows transition, the
 * standard trick for animating to/from an unknown content height) rather
 * than just mounting/unmounting the text — so whatever sits below it eases
 * into the freed-up space instead of snapping up the instant this closes. */
function HintLockedMessage({ show, className }: { show: boolean; className: string }) {
  return (
    <div
      className="grid overflow-hidden transition-[grid-template-rows] duration-[900ms] ease-in-out"
      style={{ gridTemplateRows: show ? "1fr" : "0fr" }}
    >
      <p
        className={`min-h-0 overflow-hidden transition-all duration-[900ms] ease-in-out ${
          show ? "translate-y-0 opacity-100" : "-translate-y-3.5 opacity-0"
        } ${className}`}
      >
        Hint unlocks after guess {HINT_UNLOCK_ATTEMPT}
      </p>
    </div>
  );
}

function ProgressBar({ used, total = MAX_ATTEMPTS, active }: { used: number; total?: number; active: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }, (_, i) => {
        const filled = i < used;
        const isCurrent = active && i === used;
        return (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
              filled ? "bg-present" : isCurrent ? "bg-accent" : "bg-white/10"
            }`}
          />
        );
      })}
    </div>
  );
}

/** Same shape as ProgressBar, but the final filled segment reads as the
 * winning guess (green) rather than just another used attempt (amber). */
function ResultProgressBar({ count, won }: { count: number; won: boolean }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const isWinningSeg = won && i === count - 1;
        const filled = i < count;
        return (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              isWinningSeg ? "bg-correct" : filled ? "bg-present" : "bg-white/10"
            }`}
          />
        );
      })}
    </div>
  );
}

function KnownLettersPanel({ known }: { known: KnownLetters }) {
  if (known.correct.length === 0 && known.present.length === 0 && known.absent.length === 0) return null;

  return (
    <div className="flex animate-fade-in-up-slow flex-col gap-3 border-t border-border pt-5.5">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/50">Known so far</span>
      {(known.correct.length > 0 || known.present.length > 0) && (
        <div className="flex flex-wrap gap-1.75">
          {known.correct.map((c) => (
            <span
              key={`c-${c.letter}`}
              style={{ animationDuration: "0.35s" }}
              className="animate-pop rounded-[10px] bg-correct px-2 py-1 text-xs font-medium uppercase text-white min-h-8.5"
            >
              {c.letter} · {ordinal(c.pos)}
            </span>
          ))}
          {known.present.map((letter) => (
            <span
              key={`p-${letter}`}
              style={{ animationDuration: "0.35s" }}
              className="animate-pop rounded-[10px] bg-present px-3 py-1.75 text-sm font-bold uppercase text-background"
            >
              {letter}
            </span>
          ))}
        </div>
      )}
      {known.absent.length > 0 && (
        <span
          style={{ animationDuration: "0.6s" }}
          className="animate-fade-in text-[13px] leading-relaxed text-foreground/50"
        >
          Ruled out: {known.absent.map((l) => l.toUpperCase()).join(", ")}
        </span>
      )}
    </div>
  );
}

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-in-up rounded-[26px] border border-white/10 bg-surface p-7">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">How to play</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-8 w-8 flex-none items-center justify-center rounded-[11px] bg-white/7 text-foreground/60 transition-colors hover:bg-white/12 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="mt-4 text-sm text-foreground/70">
          Guess the {WORD_LENGTH}-letter word in {MAX_ATTEMPTS} tries. Each guess must be a real word.
        </p>
        <ul className="mt-5 flex flex-col gap-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-correct text-xs font-bold text-white">
              A
            </span>
            <span className="text-foreground/75">Green — right letter, right spot.</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-present text-xs font-bold text-background">
              B
            </span>
            <span className="text-foreground/75">Amber — right letter, wrong spot.</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-absent text-xs font-bold text-white">
              C
            </span>
            <span className="text-foreground/75">Gray — letter isn&apos;t in the word.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function DailyRevealScreen({
  game,
  user,
  won,
  wordNumber,
  groupDaily,
  onBack,
  onPlayInfinite,
  onOpenLeaderboard,
}: {
  game: Game;
  user: User;
  won: boolean;
  wordNumber: number;
  groupDaily: GroupDailyStats | null;
  onBack: () => void;
  onPlayInfinite: () => void;
  onOpenLeaderboard: (groupId?: string) => void;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const shortCountdown = useCountdownToNextUtcMidnight();
  const fullCountdown = useFullCountdownToNextUtcMidnight();
  const formattedDate = formatDateEyebrow(game.date);
  const nextWordNumber = wordNumber + 1;

  const eyebrow = won ? `Solved in ${game.guesses.length} of ${MAX_ATTEMPTS}` : "Out of guesses · the word was";

  const stats = won
    ? [
        { label: "Day streak", value: String(user.stats.currentStreak), accent: true },
        { label: "Words played", value: String(user.stats.gamesPlayed) },
        { label: "Until next word", value: shortCountdown, mono: true },
      ]
    : [
        { label: "Day streak", value: String(user.stats.currentStreak) },
        { label: "Best streak", value: String(user.stats.maxStreak) },
        { label: "Until next word", value: shortCountdown, mono: true },
      ];

  const groupNameButton = groupDaily && (
    <button
      type="button"
      onClick={() => onOpenLeaderboard(groupDaily.groupId)}
      className="font-semibold text-foreground/75 underline decoration-foreground/30 underline-offset-2 transition-colors hover:text-foreground"
    >
      {groupDaily.groupName}
    </button>
  );

  const footerNote = won ? (
    <p className="text-sm leading-relaxed text-foreground/55">
      {groupDaily && groupDaily.rank ? (
        <>
          You&apos;re {ordinal(groupDaily.rank)} in {groupNameButton} today.{" "}
        </>
      ) : null}
      Come back at midnight for word {nextWordNumber}.
    </p>
  ) : (
    <p className="text-sm leading-relaxed text-foreground/55">
      {groupDaily ? (
        <>
          {capitalize(numberWord(groupDaily.wonCount))} of {numberWord(groupDaily.total)} in {groupNameButton} got it
          today.{" "}
        </>
      ) : null}
      Word {nextWordNumber} arrives at midnight.
    </p>
  );

  const primaryAction = won
    ? { label: "Share result", onClick: () => setShareOpen(true), icon: <ShareIcon /> }
    : { label: "Play Infinite", onClick: onPlayInfinite, icon: null };
  const secondaryAction = won
    ? { label: "Play Infinite", onClick: onPlayInfinite }
    : { label: "Share result", onClick: () => setShareOpen(true) };

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-10 md:py-10">
      {/* mobile top bar — dimmed, the reveal sheet below has focus */}
      <div className="flex items-center gap-3.5 opacity-45 md:hidden">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-xl bg-white/7 text-foreground"
        >
          <BackIcon />
        </button>
        <span className="text-[15.5px] font-semibold">Play Daily</span>
        <span className="ml-auto flex-none text-xs text-foreground/55">Word no. {wordNumber}</span>
      </div>

      <div className="relative mt-5 animate-fade-in md:hidden">
        <GuessWordBoard guesses={game.guesses} currentGuess="" celebrate={won} interactive={false} />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{ background: "linear-gradient(180deg, transparent 0%, var(--background) 92%)" }}
        />
      </div>

      {/* mobile reveal sheet */}
      <div
        className="-mx-4 mt-auto flex animate-fade-in-up flex-col gap-5.5 rounded-t-[30px] border-t border-accent/25 bg-surface px-6 pb-7 pt-7 shadow-lg md:hidden"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-start gap-3.5">
          <div className="flex min-w-0 flex-col gap-2">
            <span
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${won ? "text-correct" : "text-foreground/50"}`}
            >
              {eyebrow}
            </span>
            <span className="text-[34px] font-bold uppercase leading-none tracking-[0.06em]">{game.word}</span>
            <DifficultyBadge difficulty={game.difficulty} />
          </div>
          <span className="ml-auto flex flex-none flex-col items-end gap-1.5">
            {won ? (
              <span className="whitespace-nowrap rounded-full bg-accent/15 px-3.25 py-1.75 text-[13px] font-bold text-accent">
                {user.stats.currentStreak} day streak
              </span>
            ) : (
              <span className="whitespace-nowrap rounded-full bg-white/8 px-3.25 py-1.75 text-[13px] font-semibold text-foreground/70">
                Streak reset
              </span>
            )}
            <span className="text-xs text-foreground/50">
              {won ? `Wins ${user.stats.gamesWon} of ${user.stats.gamesPlayed}` : `Best was ${user.stats.maxStreak}`}
            </span>
          </span>
        </div>

        <ResultProgressBar count={game.guesses.length} won={won} />

        <div className="flex items-center justify-between gap-4 rounded-[18px] bg-white/5 px-4.5 py-4">
          <span className="flex flex-col gap-0.75">
            <span className="text-[12.5px] text-foreground/50">Next word in</span>
            <span className="text-[20px] font-semibold tabular-nums tracking-[0.02em]">{fullCountdown}</span>
          </span>
          {groupDaily && (
            <span className="flex flex-col items-end gap-0.75 text-right">
              <span className="text-[12.5px] text-foreground/50">{groupDaily.groupName}</span>
              <span className={`text-sm font-semibold ${won ? "text-accent" : "text-foreground/75"}`}>
                {won
                  ? groupDaily.rank
                    ? `${ordinal(groupDaily.rank)} of ${groupDaily.total} today`
                    : `${groupDaily.total} played today`
                  : `${groupDaily.wonCount} of ${groupDaily.total} solved it`}
              </span>
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="flex-1 rounded-2xl bg-accent py-4 text-center text-[15.5px] font-bold text-background shadow-sm shadow-accent/30 transition-transform active:scale-[0.98]"
          >
            {primaryAction.label}
          </button>
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="whitespace-nowrap rounded-2xl border border-border bg-white/7 px-5 py-4 text-[15.5px] font-semibold transition-colors hover:bg-white/12"
          >
            {secondaryAction.label}
          </button>
          <button
            type="button"
            onClick={() => onOpenLeaderboard(groupDaily?.groupId)}
            aria-label="Leaderboard"
            className="flex flex-none items-center justify-center rounded-2xl border border-border bg-white/7 px-4.5 py-4 text-foreground/80 transition-colors hover:bg-white/12"
          >
            <LeaderboardIcon />
          </button>
        </div>
      </div>

      {/* desktop reveal */}
      <div className="hidden flex-1 items-start justify-center gap-18 md:grid md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="w-full animate-fade-in-up">
          <GuessWordBoard guesses={game.guesses} currentGuess="" celebrate={won} interactive={false} />
        </div>

        <div className="flex max-w-xl animate-fade-in-up flex-col gap-6.5" style={{ animationDelay: "100ms" }}>
          <div className="flex flex-col gap-3.5">
            <span
              className={`text-[12.5px] font-semibold uppercase tracking-[0.18em] ${won ? "text-correct" : "text-foreground/50"}`}
            >
              {eyebrow}
            </span>
            <span className="text-[64px] font-bold uppercase leading-none tracking-[0.06em]">{game.word}</span>
            <span className="flex items-center gap-2.5 text-[15px] text-foreground/65">
              Word no. {wordNumber} · {formattedDate}
              <DifficultyBadge difficulty={game.difficulty} />
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4.5 border-y border-white/10 py-6">
            {stats.map((s) => (
              <span key={s.label} className="flex flex-col gap-1.25">
                <span
                  className={`text-[30px] font-light tracking-[-0.02em] ${s.accent ? "text-accent" : ""} ${
                    s.mono ? "tabular-nums" : ""
                  }`}
                >
                  {s.value}
                </span>
                <span className="text-[13px] text-foreground/65">{s.label}</span>
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl bg-accent px-6.5 py-4 text-[15.5px] font-bold text-background shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </button>
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="whitespace-nowrap rounded-2xl border border-border bg-white/7 px-6.5 py-4 text-[15.5px] font-semibold transition-colors hover:bg-white/12"
            >
              {secondaryAction.label}
            </button>
            <button
              type="button"
              onClick={() => onOpenLeaderboard(groupDaily?.groupId)}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-border bg-white/7 px-6.5 py-4 text-[15.5px] font-semibold transition-colors hover:bg-white/12"
            >
              <LeaderboardIcon />
              Leaderboard
            </button>
          </div>

          {footerNote}
        </div>
      </div>

      {shareOpen && (
        <ShareModal
          game={game}
          user={user}
          wordNumber={wordNumber}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}

export default function PlayScreen({
  mode,
  onBack,
  onOpenLeaderboard,
  onPlayInfinite,
}: {
  mode: PlayMode;
  onBack: () => void;
  onOpenLeaderboard: (groupId?: string) => void;
  onPlayInfinite: () => void;
}) {
  const { user, refreshUser } = useAuth();
  // Seeded from the last-seen board (lib/cache.ts) so a reload renders it
  // straight away instead of a loader; the fetch below revalidates it, and
  // the server stays the authority on every guess regardless.
  const [game, setGame] = useState<Game | null>(() => readCache<Game>(gameCacheKey(mode), { sameDay: mode === "daily" }));
  const [currentGuess, setCurrentGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => game === null);
  const [submitting, setSubmitting] = useState(false);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [groupDaily, setGroupDaily] = useState<GroupDailyStats | null>(() =>
    mode === "daily" ? readCache<GroupDailyStats>(GROUP_DAILY_CACHE_KEY, { sameDay: true }) : null,
  );
  const [hintRevealed, setHintRevealed] = useState(false);
  const [hintLockedMsgOpen, setHintLockedMsgOpen] = useState(false);
  const fullCountdown = useFullCountdownToNextUtcMidnight();

  // Clicking the still-locked hint icon surfaces the "unlocks after guess N"
  // message; it's not shown by default, and closes itself after 10s if the
  // player hasn't reached the unlock threshold by then. The message stays
  // mounted either way — HintLockedMessage below animates its own height via
  // a grid-template-rows transition, so the content below it eases into the
  // freed-up space instead of snapping up the instant this flips to false.
  useEffect(() => {
    if (!hintLockedMsgOpen) return;
    const id = setTimeout(() => setHintLockedMsgOpen(false), 10_000);
    return () => clearTimeout(id);
  }, [hintLockedMsgOpen]);

  useEffect(() => {
    const fetchCurrent = mode === "daily" ? getTodayGame : getInfiniteCurrent;
    fetchCurrent()
      .then(({ game }) => setGame(game))
      .finally(() => setLoading(false));
  }, [mode]);

  // Every board change (initial fetch, each guess, a new infinite round) is
  // what the next reload shows first.
  useEffect(() => {
    if (game) writeCache(gameCacheKey(mode), game);
  }, [game, mode]);

  const hasGroup = mode === "daily" && !!user && user.groups.length > 0;
  // Only "won"/"lost" (not the null -> "in-progress" transition on initial
  // load) should trigger a leaderboard refetch below.
  const gameFinished = game?.status === "won" || game?.status === "lost";

  useEffect(() => {
    if (!hasGroup || !user) return;
    const first = user.groups[0];
    const groupId = typeof first === "string" ? first : first._id;
    let cancelled = false;
    // Retry-once-on-failure is handled centrally by apiFetch (see lib/api.ts)
    // — this call site only needs to handle the final outcome. This is a
    // summary badge, not the paginated leaderboard screen, so it requests
    // the server's max page size (100) in one shot rather than paging
    // through everything just to count wins — `me` gives the caller's own
    // rank directly regardless of page, per the pagination contract.
    getGroupDailyLeaderboard(groupId, { limit: 100 })
      .then(({ group, leaderboard, pagination, me }) => {
        if (cancelled) return;
        const stats: GroupDailyStats = {
          groupId,
          groupName: group.name,
          rank: me?.rank ?? null,
          total: pagination.total,
          wonCount: leaderboard.filter((e) => e.status === "won").length,
        };
        setGroupDaily(stats);
        writeCache(GROUP_DAILY_CACHE_KEY, stats);
      })
      .catch(() => {
        if (!cancelled) setGroupDaily(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hasGroup, mode, user, gameFinished]);

  const handleNextWord = useCallback(async () => {
    // Also doubles as "skip this round" while one is still in progress —
    // /infinite/new abandons whatever's active and hands back a fresh round.
    try {
      const { game } = await startNewInfiniteRound();
      setGame(game);
      setCurrentGuess("");
      setError(null);
      setHintRevealed(false);
      setHintLockedMsgOpen(false);
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
  const wordNumber = mode === "daily" ? wordNumberForDate(game.date) : null;

  if (mode === "daily" && finished && user && wordNumber !== null) {
    return (
      <DailyRevealScreen
        game={game}
        user={user}
        won={won}
        wordNumber={wordNumber}
        groupDaily={groupDaily}
        onBack={onBack}
        onPlayInfinite={onPlayInfinite}
        onOpenLeaderboard={onOpenLeaderboard}
      />
    );
  }

  const guessNumber = Math.min(game.guesses.length + (finished ? 0 : 1), MAX_ATTEMPTS);
  const guessesLeft = MAX_ATTEMPTS - game.guesses.length;
  const known = buildKnownLetters(game.guesses);
  const hintUnlocked = game.guesses.length >= HINT_UNLOCK_ATTEMPT;

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-10 md:py-10">
      {/* mobile top bar */}
      <div className="flex items-center gap-3.5 md:hidden">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-xl bg-white/7 text-foreground transition-colors hover:bg-white/12"
        >
          <BackIcon />
        </button>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15.5px] font-semibold">{mode === "daily" ? "Play Daily" : "Infinite"}</span>
          <span className="truncate text-xs text-foreground/55">
            {mode === "daily" ? `No. ${wordNumber} · ` : ""}guess {guessNumber} of {MAX_ATTEMPTS}
          </span>
        </span>
        {mode === "infinite" && !finished && (
          <button
            type="button"
            onClick={handleNextWord}
            className="ml-auto flex-none whitespace-nowrap rounded-full bg-white/8 px-3.5 py-2 text-xs font-semibold text-foreground/75 transition-colors hover:text-accent"
          >
            New word
          </button>
        )}
        {mode === "daily" && groupDaily && groupDaily.rank && (
          <span className="ml-auto flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full bg-accent/13 px-3.5 py-2 text-[12.5px] font-semibold text-accent">
            <GroupIcon />
            {ordinal(groupDaily.rank)} of {groupDaily.total}
          </span>
        )}
      </div>

      {(game.difficulty || game.hint) && (
        <div className="mt-3 flex flex-col gap-1.5 md:hidden">
          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={game.difficulty} />
            <HintButton
              hint={game.hint}
              unlocked={hintUnlocked}
              revealed={hintRevealed}
              onToggle={() => setHintRevealed((r) => !r)}
              onLockedClick={() => setHintLockedMsgOpen(true)}
            />
          </div>
          {game.hint && !hintUnlocked && (
            <HintLockedMessage show={hintLockedMsgOpen} className="text-[13px] text-foreground/50" />
          )}
          {game.hint && hintUnlocked && hintRevealed && (
            <p className="animate-fade-in text-[13px] text-foreground/65">{game.hint}</p>
          )}
        </div>
      )}

      <div className="mt-4 md:hidden">
        <ProgressBar used={game.guesses.length} active={!finished} />
      </div>

      <div className="mt-6 grid flex-1 items-start gap-8 md:mt-0 md:grid-cols-[260px_minmax(0,1fr)_300px] md:gap-12">
        {/* left sidebar */}
        <aside className="hidden flex-col gap-6.5 md:flex">
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
              {mode === "daily" ? formatDateEyebrow(game.date) : "Infinite mode"}
            </span>
            <span className="text-[32px] font-light leading-none tracking-[-0.02em]">
              {mode === "daily" ? `Word ${wordNumber}` : "Free play"}
            </span>
            <span className="text-sm text-foreground/65">
              Guess {guessNumber} of {MAX_ATTEMPTS}
            </span>
          </div>

          {(game.difficulty || game.hint) && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <DifficultyBadge difficulty={game.difficulty} />
                <HintButton
                  hint={game.hint}
                  unlocked={hintUnlocked}
                  revealed={hintRevealed}
                  onToggle={() => setHintRevealed((r) => !r)}
                  onLockedClick={() => setHintLockedMsgOpen(true)}
                />
              </div>
              {game.hint && !hintUnlocked && (
                <HintLockedMessage show={hintLockedMsgOpen} className="text-[13px] leading-relaxed text-foreground/50" />
              )}
              {game.hint && hintUnlocked && hintRevealed && (
                <p className="animate-fade-in text-[13px] leading-relaxed text-foreground/65">{game.hint}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <ProgressBar used={game.guesses.length} active={!finished} />
            <span className="text-[13px] text-foreground/50">
              {finished
                ? "Round over"
                : `${NUMBER_WORDS[guessesLeft]} guess${guessesLeft === 1 ? "" : "es"} left`}
            </span>
          </div>

          <KnownLettersPanel known={known} />
        </aside>

        {/* center column */}
        <div className="relative flex w-full flex-1 flex-col items-center gap-6">
          {finished && (
            <div
              className={`w-full max-w-xl animate-fade-in-up rounded-[20px] border p-4 text-center shadow-sm ${
                won ? "border-correct/40 bg-correct/10 shadow-correct/10" : "border-border bg-surface"
              }`}
            >
              <p className="text-lg font-bold">
                {won ? (
                  <>
                    You won! <span className="inline-block animate-tile-bounce">🎉</span>
                  </>
                ) : (
                  "Out of guesses"
                )}
              </p>
              {game.word && (
                <p className="text-sm text-foreground/70">
                  The word was <span className="font-semibold uppercase">{game.word}</span>
                </p>
              )}
              <button
                type="button"
                onClick={handleNextWord}
                className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
              >
                Next word
              </button>
            </div>
          )}

          {error && (
            <p key={shakeSignal} className="animate-fade-in text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <GuessWordBoard
            guesses={game.guesses}
            currentGuess={currentGuess}
            shakeSignal={shakeSignal}
            celebrate={won}
            interactive={!finished}
          />

          <Keyboard guesses={game.guesses} onKey={handleKey} disabled={finished || submitting} />
        </div>

        {/* right sidebar */}
        <aside className="hidden flex-col gap-4.5 md:flex">
          {mode === "daily" ? (
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-white/4.5 p-5">
              <span className="flex flex-col gap-0.75">
                <span className="text-[12.5px] text-foreground/50">Next word in</span>
                <span className="text-[19px] font-semibold tabular-nums">{fullCountdown}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-white/4.5 p-5">
              <span className="flex flex-col gap-0.75">
                <span className="text-[12.5px] text-foreground/50">Unlimited practice</span>
                <span className="text-[14.5px] font-semibold">No stats, no streak</span>
              </span>
              {!finished && (
                <button
                  type="button"
                  onClick={handleNextWord}
                  className="whitespace-nowrap rounded-xl bg-white/8 px-3.5 py-2 text-xs font-semibold text-foreground/80 transition-colors hover:bg-white/14 hover:text-foreground"
                >
                  New word
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setHowToPlayOpen(true)}
            className="rounded-xl border border-border bg-white/7 px-4 py-2.75 text-left text-[13.5px] font-semibold transition-colors hover:bg-white/12"
          >
            How to play
          </button>
        </aside>
      </div>

      {howToPlayOpen && <HowToPlayModal onClose={() => setHowToPlayOpen(false)} />}
    </div>
  );
}
