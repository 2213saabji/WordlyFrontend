"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GuessWordBoard, { clearDurationMs } from "@/components/GuessWordBoard";
import WordMeaning from "@/components/WordMeaning";
import Reveal from "@/components/Reveal";
import Keyboard from "@/components/Keyboard";
import Loader from "@/components/Loader";
import {
  getGroupDailyLeaderboard,
  getInfiniteCurrent,
  getTodayGame,
  revealInfiniteHint,
  startNewInfiniteRound,
  submitGuess,
  submitInfiniteGuess,
  warmUpBackend,
  ApiRequestError,
} from "@/lib/api";
import ShareModal from "@/components/ShareModal";
import CoinChip from "@/components/CoinChip";
import { PaidHintCard, PaidHintRow, PaidHintSheets, usePaidHint } from "@/components/PaidHint";
import { TierChip } from "@/components/TierBadge";
import {
  HintsOffNotice,
  TierResultCard,
  TodayCard,
  TodayStrip,
  useInfiniteTier,
  type TierRoundResult,
} from "@/components/InfiniteTierPanel";
import { hintCostOf } from "@/lib/tiers";
import { useAuth } from "@/lib/auth-context";
import { readCache, writeCache } from "@/lib/cache";
import { setCoinBalance } from "@/lib/coins";
import { PlayStateReporter } from "@/lib/training";
import { invalidate, runSync } from "@/lib/sync";
import { useSyncedLoader } from "@/lib/use-synced";
import { isKnownGuess, preloadWordLists } from "@/lib/word-check";
import HubBackLink from "@/components/HubBackLink";
import { formatDuration } from "@/components/Leaderboard";
import { guessPublicRound, newPublicRound, restorePublicGame } from "@/lib/public-round";
import { wordNumberForDate } from "@/lib/share";
import type { PlayMode } from "@/lib/screen-context";
import type { Game, GameDifficulty, Guess, LetterResult, TodayProgress, User } from "@/types";

const WORD_LENGTH = 5;
const MAX_ATTEMPTS = 6;
// Next word transition: clear the tiles, slide the board out, slide the
// new one in (keyframes in globals.css).
const BOARD_OUT_MS = 220;
const BOARD_IN_MS = 340;
// Toast over the board: eases in, holds, eases out.
const TOAST_DELAY_MS = 800;
const TOAST_HOLD_MS = 2_000;
const TOAST_IN_MS = 800;
const TOAST_OUT_MS = 380;

// The result UI waits for the last guess's tiles to finish flipping
// (GuessWordBoard: 90 ms stagger x 4 + 550 ms flip) before easing in.
const RESULT_SETTLE_MS = 900;

type BoardPhase = "idle" | "clearing" | "leaving" | "entering";

// On Next word the old round's difficulty/hint row stays up this long
// (from the click), then fades out and the new round's row eases in.
const HELD_ROW_MS = 2_000;
const ROW_FADE_MS = 450;

/** The difficulty/hint row as it looked when Next word was pressed. */
interface HeldRow {
  key: number;
  fading: boolean;
  difficulty: GameDifficulty | undefined;
  hintAvailable: boolean;
  hintUnlocked: boolean;
  hintRevealed: boolean;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const GROUP_DAILY_CACHE_KEY = "play:group-daily";

/** Today's daily board is only valid until UTC midnight — reads of the
 * daily key pass `sameDay` so yesterday's board never flashes up. */
function gameCacheKey(mode: PlayMode): string {
  return `play:${mode}`;
}
// The hint stays locked until this many guesses have been submitted — it's
// a fallback for once you're stuck, not a shortcut from guess one.
const HINT_UNLOCK_ATTEMPT = 4;
// Guests never get the hint — the locked icon says this instead.
const GUEST_HINT_MESSAGE = "Log in to get hints";
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

/** Toggles showing the hint. Its text either arrives with the game object
 * or, for Infinite, is fetched on first reveal (see
 * toggleHint in PlayScreen). Stays locked (shows a lock icon instead) until
 * HINT_UNLOCK_ATTEMPT guesses are in. */
function RepeatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function HintButton({
  available,
  unlocked,
  revealed,
  onToggle,
  onLockedClick,
  lockedLabel = `Hint unlocks after guess ${HINT_UNLOCK_ATTEMPT}`,
}: {
  available: boolean;
  unlocked: boolean;
  revealed: boolean;
  onToggle: () => void;
  onLockedClick: () => void;
  /** Why it's locked — a guest's is "Log in to get hints". */
  lockedLabel?: string;
}) {
  if (!available) return null;
  if (!unlocked) {
    return (
      <button
        type="button"
        onClick={onLockedClick}
        data-tour="hint-locked"
        aria-label={lockedLabel}
        title={lockedLabel}
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
      data-tour="hint-bulb"
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
 * into the freed-up space instead of snapping up the instant this closes.
 * `gap` is the parent's flex gap in px: while closed, a matching negative
 * margin cancels it, so the row is the same height whether this is mounted
 * or not (e.g. the held row on Next word, which leaves it out). */
function HintLockedMessage({
  show,
  className,
  gap,
  text = `Hint unlocks after guess ${HINT_UNLOCK_ATTEMPT}`,
}: {
  show: boolean;
  className: string;
  gap: number;
  text?: string;
}) {
  return (
    <div
      className="grid overflow-hidden transition-[grid-template-rows,margin] duration-[900ms] ease-in-out"
      style={{ gridTemplateRows: show ? "1fr" : "0fr", marginBottom: show ? 0 : -gap }}
    >
      <p
        className={`min-h-0 overflow-hidden transition-all duration-[900ms] ease-in-out ${
          show ? "translate-y-0 opacity-100" : "-translate-y-3.5 opacity-0"
        } ${className}`}
      >
        {text}
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
            // Emptying (Next word) runs right to left; filling stays quick.
            style={filled || isCurrent ? undefined : { transitionDuration: "450ms", transitionDelay: `${(total - 1 - i) * 60}ms` }}
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

function hasKnownLetters(known: KnownLetters) {
  return known.correct.length > 0 || known.present.length > 0 || known.absent.length > 0;
}

function KnownLettersPanel({ known }: { known: KnownLetters }) {
  if (!hasKnownLetters(known)) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-5.5">
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

/** Guest board: the nudge to log in — on the result card, and in the
 * desktop sidebar while a round is on. */
function LoginPrompt({ onLogin, className = "" }: { onLogin: () => void; className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 ${className}`}>
      <span className="flex-1 text-[13px] leading-snug text-foreground/80">
        Log in to earn coins and climb the leaderboard
      </span>
      <button
        type="button"
        onClick={onLogin}
        className="flex-none whitespace-nowrap rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-background transition-transform active:scale-[0.97]"
      >
        Log in
      </button>
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
    ? { label: "Share result", onClick: () => setShareOpen(true), icon: <ShareIcon />, tour: "daily-share" }
    : { label: "Play Infinite", onClick: onPlayInfinite, icon: null, tour: undefined };
  const secondaryAction = won
    ? { label: "Play Infinite", onClick: onPlayInfinite, tour: undefined }
    : { label: "Share result", onClick: () => setShareOpen(true), tour: "daily-share" };

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
          <span data-tour="daily-streak" className="ml-auto flex flex-none flex-col items-end gap-1.5">
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

        <WordMeaning meaning={game.wordMeaning} tour="daily-meaning" />

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
            data-tour={primaryAction.tour}
            className="flex-1 rounded-2xl bg-accent py-4 text-center text-[15.5px] font-bold text-background shadow-sm shadow-accent/30 transition-transform active:scale-[0.98]"
          >
            {primaryAction.label}
          </button>
          <button
            type="button"
            onClick={secondaryAction.onClick}
            data-tour={secondaryAction.tour}
            className="whitespace-nowrap rounded-2xl border border-border bg-white/7 px-5 py-4 text-[15.5px] font-semibold transition-colors hover:bg-white/12"
          >
            {secondaryAction.label}
          </button>
          <button
            type="button"
            onClick={() => onOpenLeaderboard(groupDaily?.groupId)}
            data-tour="daily-leaderboard"
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
            <WordMeaning meaning={game.wordMeaning} className="max-w-md" tour="daily-meaning" />
            <span className="flex items-center gap-2.5 text-[15px] text-foreground/65">
              Word no. {wordNumber} · {formattedDate}
              <DifficultyBadge difficulty={game.difficulty} />
            </span>
          </div>

          <div data-tour="daily-streak" className="grid grid-cols-3 gap-4.5 border-y border-white/10 py-6">
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
              data-tour={primaryAction.tour}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl bg-accent px-6.5 py-4 text-[15.5px] font-bold text-background shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </button>
            <button
              type="button"
              onClick={secondaryAction.onClick}
              data-tour={secondaryAction.tour}
              className="whitespace-nowrap rounded-2xl border border-border bg-white/7 px-6.5 py-4 text-[15.5px] font-semibold transition-colors hover:bg-white/12"
            >
              {secondaryAction.label}
            </button>
            <button
              type="button"
              onClick={() => onOpenLeaderboard(groupDaily?.groupId)}
              data-tour="daily-leaderboard"
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
  onOpenTierLeaderboard,
  onOpenInfiniteHub,
  guest = false,
  onLogin,
}: {
  mode: PlayMode;
  onBack: () => void;
  onOpenLeaderboard: (groupId?: string) => void;
  onPlayInfinite: () => void;
  /** The tier result's "Board" / "Leaderboard" button. */
  onOpenTierLeaderboard?: () => void;
  /** Infinite: Back leads to the Infinite hub. */
  onOpenInfiniteHub?: () => void;
  /** Signed-out Infinite on "/": public rounds (lib/public-round.ts), no
   * token sent, no tiers, coins or stats. Its leaderboard link is
   * onOpenLeaderboard (the public board). */
  guest?: boolean;
  /** Guest: the "Log in to earn coins" prompts. */
  onLogin?: () => void;
}) {
  const { user, refreshUser } = useAuth();
  // Seeded from the last-seen board (lib/cache.ts) so a reload renders it
  // straight away instead of a loader; the fetch below revalidates it, and
  // the server stays the authority on every guess regardless. A guest's
  // round is restored from this tab's session instead.
  const [game, setGame] = useState<Game | null>(() =>
    guest ? restorePublicGame() : readCache<Game>(gameCacheKey(mode), { sameDay: mode === "daily" }),
  );
  const [currentGuess, setCurrentGuess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => game === null);
  const [submitting, setSubmitting] = useState(false);
  // A guess still waiting on the server: 1 = the row pulses, 2 = it's been
  // long enough to say so in words.
  const [waitStage, setWaitStage] = useState<0 | 1 | 2>(0);
  const [shakeSignal, setShakeSignal] = useState(0);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [groupDaily, setGroupDaily] = useState<GroupDailyStats | null>(() =>
    mode === "daily" ? readCache<GroupDailyStats>(GROUP_DAILY_CACHE_KEY, { sameDay: true }) : null,
  );
  const [hintRevealed, setHintRevealed] = useState(false);
  const [hintLockedMsgOpen, setHintLockedMsgOpen] = useState(false);
  const fullCountdown = useFullCountdownToNextUtcMidnight();

  // Infinite tier leaderboard: tier status and today's progress. Active time
  // is counted server-side from round starts and guesses — no heartbeat.
  // Inert for Daily and for guests.
  const tierMode = mode === "infinite" && !guest;
  const { me: tierMe, tiers, today, setToday, refreshMe, hintsOffFrom, paidHintsFrom } = useInfiniteTier(tierMode);
  // The tier summary for the round that just ended (from its final guess
  // response) — shown as a bottom sheet on mobile, a sidebar card on desktop.
  const [tierResult, setTierResult] = useState<TierRoundResult | null>(null);
  const [resultSheetOpen, setResultSheetOpen] = useState(false);
  const [boardPhase, setBoardPhase] = useState<BoardPhase>("idle");
  const nextWordBusy = useRef(false);
  const [heldRow, setHeldRow] = useState<HeldRow | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; word?: string } | null>(null);
  const [toastClosing, setToastClosing] = useState(false);

  const showToast = useCallback((title: string, word?: string) => {
    setToast({ id: Date.now(), title, word });
    setToastClosing(false);
  }, []);

  // Each new toast restarts the cycle: show, hold, ease out, remove.
  useEffect(() => {
    if (!toast) return;
    const hold = setTimeout(() => setToastClosing(true), TOAST_DELAY_MS + TOAST_IN_MS + TOAST_HOLD_MS);
    const done = setTimeout(() => {
      setToast(null);
      setToastClosing(false);
    }, TOAST_DELAY_MS + TOAST_IN_MS + TOAST_HOLD_MS + TOAST_OUT_MS);
    return () => {
      clearTimeout(hold);
      clearTimeout(done);
    };
  }, [toast]);

  // Held row: fade its content out in place after HELD_ROW_MS, then swap in
  // the live row (which fades in) once that fade is done.
  useEffect(() => {
    if (!heldRow) return;
    const id = heldRow.fading
      ? setTimeout(() => setHeldRow(null), ROW_FADE_MS)
      : setTimeout(() => setHeldRow((h) => (h && h.key === heldRow.key ? { ...h, fading: true } : h)), HELD_ROW_MS);
    return () => clearTimeout(id);
  }, [heldRow]);
  // Rank going into the next round, for the result's ↑/↓ delta.
  const prevRankRef = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (tierMe && prevRankRef.current === undefined) prevRankRef.current = tierMe.rank;
  }, [tierMe]);
  // An in-progress Infinite round may not carry `hint` — it's
  // fetched from POST /game/infinite/hint on first reveal and kept here.
  const [fetchedHint, setFetchedHint] = useState<string | null>(null);
  // The hint endpoint said no (403 HINTS_DISABLED_FOR_TIER), e.g. after an
  // overnight promotion into Tier 6 mid-round.
  const [hintsRejected, setHintsRejected] = useState(false);

  // Clicking the still-locked hint icon surfaces the "unlocks after guess N"
  // message; it's not shown by default, and closes itself after 10s if the
  // player hasn't reached the unlock threshold by then. The message stays
  // mounted either way — HintLockedMessage below animates its own height via
  // a grid-template-rows transition, so the content below it eases into the
  // freed-up space instead of snapping up the instant this flips to false.
  useEffect(() => {
    if (!hintLockedMsgOpen) return;
    const id = setTimeout(() => setHintLockedMsgOpen(false), 5_000);
    return () => clearTimeout(id);
  }, [hintLockedMsgOpen]);

  // The word lists for the guess pre-check load on demand — start now so
  // they're ready before the first guess.
  useEffect(() => {
    preloadWordLists();
  }, []);

  // Today's daily game is synced (`today`): shown from cache and refetched
  // only when /sync reports a change (a guess on another device, or a new
  // daily word). The current Infinite round isn't covered by /sync, so it's
  // fetched on every visit, as before.
  useSyncedLoader({
    flag: "today",
    key: gameCacheKey("daily"),
    enabled: mode === "daily",
    sameDay: true,
    load: async () => {
      try {
        const { game } = await getTodayGame();
        setGame(game);
        // Cached right away so the fresh mark and the cache agree.
        writeCache(gameCacheKey("daily"), game);
      } finally {
        setLoading(false);
      }
    },
  });
  useEffect(() => {
    if (mode !== "infinite" || guest) return;
    getInfiniteCurrent()
      .then(({ game }) => setGame(game))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mode, guest]);
  // A guest picks up the round saved in this tab, else starts one.
  useEffect(() => {
    if (!guest || restorePublicGame()) return;
    newPublicRound()
      .then(setGame)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guest]);

  // Every board change (initial fetch, each guess, a new infinite round) is
  // what the next reload shows first. (A guest's round saves itself.)
  useEffect(() => {
    if (game && !guest) writeCache(gameCacheKey(mode), game);
  }, [game, mode, guest]);

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
    if (nextWordBusy.current) return;
    nextWordBusy.current = true;
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startRound: () => Promise<{ game: Game; today?: TodayProgress }> = guest
      ? async () => ({ game: await newPublicRound() })
      : startNewInfiniteRound;
    // Fetch while the old board animates out; settled into a result so a
    // failure doesn't surface as an unhandled rejection mid-animation.
    const request = startRound().then(
      (res) => ({ ok: true as const, res }),
      (err: unknown) => ({ ok: false as const, err }),
    );
    try {
      if (animate) {
        setBoardPhase("clearing");
        await wait(clearDurationMs(game?.guesses.length ?? 0) + 120);
        setBoardPhase("leaving");
        await wait(BOARD_OUT_MS);
      }
      const outcome = await request;
      if (outcome.ok) {
        const { game: nextGame, today: next } = outcome.res;
        setGame(nextGame);
        // Starting a round credits the time since the last guess.
        if (next) setToday(next);
        setCurrentGuess("");
        setError(null);
        setHintRevealed(false);
        setHintLockedMsgOpen(false);
        setFetchedHint(null);
        setHintsRejected(false);
        setTierResult(null);
        setResultSheetOpen(false);
      } else {
        // The old round slides back in under the error.
        setHeldRow(null);
        const err = outcome.err;
        setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
      }
      if (animate) {
        setBoardPhase("entering");
        await wait(BOARD_IN_MS);
      }
    } finally {
      setBoardPhase("idle");
      nextWordBusy.current = false;
    }
  }, [game, guest, setToday]);

  const handleSubmitGuess = useCallback(async () => {
    if (submitting) return;
    if (currentGuess.length !== WORD_LENGTH) {
      setShakeSignal((n) => n + 1);
      return;
    }

    // A word already played this round would just waste a row: refuse it
    // and say why in a toast over the board.
    if (game?.guesses.some((g) => g.guess.toLowerCase() === currentGuess.toLowerCase())) {
      setShakeSignal((n) => n + 1);
      showToast("Already tried", currentGuess);
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
    const pulseTimer = window.setTimeout(() => setWaitStage(1), 300);
    const slowTimer = window.setTimeout(() => setWaitStage(2), 4_000);
    try {
      if (guest) {
        setGame(await guessPublicRound(currentGuess));
        setCurrentGuess("");
        return;
      }
      const submit = mode === "daily" ? submitGuess : submitInfiniteGuess;
      const res = await submit(currentGuess);
      const { game } = res;
      setGame(game);
      setCurrentGuess("");
      // The guess that ends the game carries the new coin balance (+10 for
      // a solve) — every coin chip shows it straight away.
      if (res.coins) setCoinBalance(res.coins.balance);
      // The guess that ends an Infinite round carries the updated tier
      // progress; mid-round guesses carry `today` only once the backend
      // adds it — until then "Active time" updates once per round.
      const infiniteRes = mode === "infinite" ? (res as Awaited<ReturnType<typeof submitInfiniteGuess>>) : undefined;
      const tierBlock = infiniteRes?.tier;
      if (tierBlock) {
        setToday(tierBlock.today);
        // After a promotion the rank is in the new tier: no "moved from #n".
        setTierResult({
          block: tierBlock,
          prevRank: tierBlock.promotion ? null : (prevRankRef.current ?? null),
          coins: infiniteRes?.coins,
        });
        setResultSheetOpen(true);
        prevRankRef.current = tierBlock.rank;
        // Rank, day count and today's card as the server now has them.
        refreshMe();
        // Tier boards now rank this round's score.
        invalidate("infiniteBoard");
        // This round moved the player up on the spot: sync now (skipping
        // the 15 s throttle) so the promotion screen shows right away.
        if (tierBlock.promotion) void runSync({ force: true });
      } else if (infiniteRes?.today) {
        setToday(infiniteRes.today);
      }
      // Infinite rounds never touch stats/streaks — only refresh the daily
      // streak/wins display when a daily game actually finishes.
      if (mode === "daily" && game.status !== "in-progress") {
        // The daily/weekly boards now include this result.
        invalidate("daily", "weekly");
        refreshUser();
      }
    } catch (err) {
      // Timed out, dropped or a server error — not the word's fault.
      const unanswered = !(err instanceof ApiRequestError) || err.status >= 500;
      if (guest || !unanswered) setShakeSignal((n) => n + 1);
      if (err instanceof ApiRequestError) {
        // A rejected guess (too short, not a real word, etc.) is a normal
        // part of play — the shake is the feedback, no need to also show text.
        if (guest && err.data?.code === "NOT_A_WORD") showToast("Not in word list", currentGuess);
        // The guest round's token is missing or broken (now cleared): start over.
        if (guest && err.data?.code === "INVALID_GAME_TOKEN") void handleNextWord();
        // Carried by e.g. GAME_OVER: the round as the server has it.
        if (err.data?.game) setGame(err.data.game);
      }
      // Timed out, dropped or a server error: the guess may still have been
      // saved (guesses are never resent automatically, so it can't count
      // twice). Reload the round so the board shows what the server has.
      if (!guest && unanswered) {
        const sentGuess = currentGuess;
        try {
          const fresh = mode === "daily" ? (await getTodayGame()).game : (await getInfiniteCurrent()).game;
          setGame(fresh);
          if (fresh.guesses.some((g) => g.guess.toLowerCase() === sentGuess.toLowerCase())) {
            setCurrentGuess("");
            if (mode === "daily" && fresh.status !== "in-progress") refreshUser();
            if (mode === "infinite") refreshMe();
          } else {
            setError("Your connection seems slow. Please press Enter to try again.");
          }
        } catch {
          setError("Your connection seems slow. Please press Enter to try again.");
        }
      } else if (!(err instanceof ApiRequestError)) {
        setError("Something went wrong");
      }
    } finally {
      window.clearTimeout(pulseTimer);
      window.clearTimeout(slowTimer);
      setWaitStage(0);
      setSubmitting(false);
    }
  }, [game, mode, guest, currentGuess, submitting, refreshUser, setToday, refreshMe, showToast, handleNextWord]);

  const handleKey = useCallback(
    (key: string) => {
      if (!game || game.status !== "in-progress" || submitting || nextWordBusy.current) return;
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
        // First letter of a guess: wake the server now if it's been idle, so
        // it's ready by the time Enter is pressed (lib/api/client.ts).
        if (currentGuess.length === 0) warmUpBackend();
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

  // The round's hint price (else the tier's): 0 free, > 0 coins, null off.
  const hintCost =
    game && (game.hintCost !== undefined || game.hintsEnabled !== undefined)
      ? hintCostOf(game)
      : tierMe
        ? hintCostOf(tierMe)
        : undefined;
  const gameId = game?.id ?? game?._id;
  const paidHint = usePaidHint({
    gameId,
    hintCost: hintCost ?? 0,
    onRevealed: (hint) => {
      setFetchedHint(hint);
      setHintRevealed(true);
    },
    onHintsOff: () => setHintsRejected(true),
    enabled: !guest,
  });

  if (loading || !game) {
    return <Loader label={mode === "daily" ? "Loading today's game…" : "Loading a fresh word…"} />;
  }

  const finished = game.status !== "in-progress";
  const won = game.status === "won";
  const wordNumber = mode === "daily" ? wordNumberForDate(game.date) : null;

  if (mode === "daily" && finished && user && wordNumber !== null) {
    return (
      <>
        <PlayStateReporter
          mode={mode}
          status={game.status}
          guesses={game.guesses.length}
          tierResult={false}
          hintBulb={false}
          hintRevealed={false}
        />
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
      </>
    );
  }

  const guessNumber = Math.min(game.guesses.length + (finished ? 0 : 1), MAX_ATTEMPTS);
  const guessesLeft = MAX_ATTEMPTS - game.guesses.length;
  const known = buildKnownLetters(game.guesses);
  const hintUnlocked = game.guesses.length >= HINT_UNLOCK_ATTEMPT;
  const clearingBoard = boardPhase === "clearing" || boardPhase === "leaving";

  // --- hints: from the payload (Daily, finished rounds, free or already
  // bought) or, for Infinite, from POST /game/infinite/hint. Free tiers use
  // the hint icon toggle; paid tiers (Tiers 1–6) the "Need a hint?" row /
  // card with a confirm sheet, so coins are never spent unasked. ---
  const hintText = game.hint ?? fetchedHint ?? undefined;
  const paidTier = tierMode && !finished && !hintsRejected && (hintCost ?? 0) > 0 && !paidHint.noClue;
  const hintsOff = tierMode && !finished && !game.hint && (hintCost === null || hintsRejected);
  // Guests can't use hints (even though the public round carries one): the
  // icon stays locked for the whole round, and tapping it says why.
  const hintAvailable = guest
    ? !finished
    : !hintsOff && !paidTier && (!!hintText || (tierMode && !finished && hintCost === 0 && !paidHint.noClue));
  const hintIconUnlocked = !guest && hintUnlocked;
  const hintLockedText = guest ? GUEST_HINT_MESSAGE : undefined;

  // Every Next word / New word button: hold this round's difficulty/hint
  // row on screen, then start the transition.
  function nextWord() {
    if (nextWordBusy.current) return;
    setHeldRow((h) =>
      h && !h.fading
        ? { ...h, key: Date.now() }
        : { key: Date.now(), fading: false, difficulty: game?.difficulty, hintAvailable, hintUnlocked: hintIconUnlocked, hintRevealed },
    );
    void handleNextWord();
  }

  async function toggleHint() {
    if (hintText) {
      setHintRevealed((r) => !r);
      return;
    }
    try {
      const { hint } = await revealInfiniteHint({ gameId });
      setFetchedHint(hint);
      setHintRevealed(true);
    } catch (err) {
      if (err instanceof ApiRequestError && err.data?.code === "HINTS_DISABLED_FOR_TIER") setHintsRejected(true);
      else setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    }
  }

  // "word 7": today's completed rounds, plus the one being played.
  const wordOfDay = tierMode && today ? today.gamesCompleted + (finished ? 0 : 1) : null;
  // Infinite with tiers: Back always leads to the hub (the tier status,
  // today's targets), wherever the round was opened from.
  const toHub = tierMode ? onOpenInfiniteHub : undefined;
  const handleBack = toHub ?? onBack;
  // The finished-round card's leaderboard link (the tier result card has
  // its own) — the board refetches, so it shows the updated rank/points.
  const boardLink = tierMode ? onOpenTierLeaderboard : guest ? () => onOpenLeaderboard() : undefined;
  const hintsOffNotice = hintsOff && (
    <HintsOffNotice fromName={hintsOffFrom?.name} fromTier={hintsOffFrom?.tier} />
  );

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 md:px-10 md:py-10">
      {/* The training follows the signed-in player's round (lib/training.ts). */}
      {!guest && (
        <PlayStateReporter
          mode={mode}
          status={game.status}
          guesses={game.guesses.length}
          tierResult={!!tierResult}
          hintBulb={!finished && hintAvailable && hintIconUnlocked}
          hintRevealed={hintRevealed}
        />
      )}
      {/* mobile top bar */}
      <div className="flex items-center gap-3.5 md:hidden">
        <button
          type="button"
          onClick={handleBack}
          aria-label={toHub ? "Back to Infinite hub" : "Back"}
          className="flex h-8.5 w-8.5 flex-none items-center justify-center rounded-xl bg-white/7 text-foreground transition-colors hover:bg-white/12"
        >
          <BackIcon />
        </button>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15.5px] font-semibold">
            {mode === "daily" ? "Play Daily" : wordOfDay ? `Infinite · word ${wordOfDay}` : "Infinite"}
          </span>
          <span className="truncate text-xs text-foreground/55">
            {mode === "daily" ? `No. ${wordNumber} · ` : ""}guess {guessNumber} of {MAX_ATTEMPTS}
          </span>
        </span>
        {mode === "infinite" && (!finished || (tierMode && tierMe)) && (
          <span className="ml-auto flex flex-none items-center gap-2">
            {tierMode && <CoinChip />}
            {tierMode && tierMe && <TierChip tier={tierMe.tier} name={tierMe.tierName} />}
            {!finished && (
              <button
                type="button"
                onClick={nextWord}
                className="flex-none whitespace-nowrap rounded-full bg-white/8 px-3.5 py-2 text-xs font-semibold text-foreground/75 transition-colors hover:text-accent"
              >
                New word
              </button>
            )}
          </span>
        )}
        {mode === "daily" && groupDaily && groupDaily.rank && (
          <span className="ml-auto flex flex-none items-center gap-1.5 whitespace-nowrap rounded-full bg-accent/13 px-3.5 py-2 text-[12.5px] font-semibold text-accent">
            <GroupIcon />
            {ordinal(groupDaily.rank)} of {groupDaily.total}
          </span>
        )}
      </div>

      {tierMode && today && (
        <div className="mt-4 md:hidden">
          <TodayStrip today={today} />
        </div>
      )}

      <Reveal
        show={!!heldRow || ((!!game.difficulty || hintAvailable) && !clearingBoard)}
        durationMs={ROW_FADE_MS}
        className="md:hidden"
      >
        <div className="mt-3 flex flex-col gap-1.5">
          {heldRow ? (
            // The previous round's row, display only. It fades out in place
            // (same height as the live row), so nothing below moves.
            <div
              style={{ transitionDuration: `${ROW_FADE_MS}ms` }}
              className={`flex items-center gap-2 transition-opacity ${heldRow.fading ? "opacity-0" : "opacity-100"}`}
            >
              <DifficultyBadge difficulty={heldRow.difficulty} />
              <HintButton
                available={heldRow.hintAvailable}
                unlocked={heldRow.hintUnlocked}
                revealed={heldRow.hintRevealed}
                onToggle={() => {}}
                onLockedClick={() => {}}
              />
            </div>
          ) : (
            <div className="flex animate-fade-in items-center gap-2">
              <DifficultyBadge difficulty={game.difficulty} />
              <HintButton
                available={hintAvailable}
                unlocked={hintIconUnlocked}
                revealed={hintRevealed}
                onToggle={toggleHint}
                lockedLabel={hintLockedText}
                onLockedClick={() => setHintLockedMsgOpen(true)}
              />
            </div>
          )}
          {!heldRow && hintAvailable && !hintIconUnlocked && (
            <HintLockedMessage show={hintLockedMsgOpen} gap={6} className="text-[13px] text-foreground/50" text={hintLockedText} />
          )}
          <Reveal show={!!hintText && hintUnlocked && hintRevealed && boardPhase === "idle"} gap={6}>
            <p className="text-[13px] text-foreground/65">{hintText}</p>
          </Reveal>
        </div>
      </Reveal>

      <div className="mt-4 md:hidden">
        <ProgressBar used={clearingBoard ? 0 : game.guesses.length} active={!finished && !clearingBoard} />
      </div>

      <div className="mt-6 grid flex-1 items-start gap-8 md:mt-0 md:grid-cols-[260px_minmax(0,1fr)_300px] md:gap-12">
        {/* left sidebar */}
        <aside className="hidden flex-col gap-6.5 md:flex">
          {toHub && <HubBackLink onClick={toHub} className="-mb-2" />}
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-foreground/50">
              {mode === "daily" ? formatDateEyebrow(game.date) : wordOfDay ? `Infinite · word ${wordOfDay}` : "Infinite mode"}
            </span>
            <span className="text-[32px] font-light leading-none tracking-[-0.02em]">
              {mode === "daily" ? `Word ${wordNumber}` : "Free play"}
            </span>
            <span className="text-sm text-foreground/65">
              Guess {guessNumber} of {MAX_ATTEMPTS}
            </span>
          </div>

          {tierMode && today && (
            <TodayCard
              today={today}
              stickDays={tierMe?.counter.stickDays}
              daysToStick={tierMe?.counter.daysToStick}
            />
          )}

          <Reveal
            show={!!heldRow || ((!!game.difficulty || hintAvailable) && !clearingBoard)}
            durationMs={ROW_FADE_MS}
            gap={26}
          >
            <div className="flex flex-col gap-2">
              {heldRow ? (
                // The previous round's row, display only. It fades out in place
                // (same height as the live row), so nothing below moves.
                <div
                  style={{ transitionDuration: `${ROW_FADE_MS}ms` }}
                  className={`flex items-center gap-2 transition-opacity ${heldRow.fading ? "opacity-0" : "opacity-100"}`}
                >
                  <DifficultyBadge difficulty={heldRow.difficulty} />
                  <HintButton
                    available={heldRow.hintAvailable}
                    unlocked={heldRow.hintUnlocked}
                    revealed={heldRow.hintRevealed}
                    onToggle={() => {}}
                    onLockedClick={() => {}}
                  />
                </div>
              ) : (
                <div className="flex animate-fade-in items-center gap-2">
                  <DifficultyBadge difficulty={game.difficulty} />
                  <HintButton
                    available={hintAvailable}
                    unlocked={hintIconUnlocked}
                    revealed={hintRevealed}
                    onToggle={toggleHint}
                    lockedLabel={hintLockedText}
                    onLockedClick={() => setHintLockedMsgOpen(true)}
                  />
                </div>
              )}
              {!heldRow && hintAvailable && !hintIconUnlocked && (
                <HintLockedMessage
                  show={hintLockedMsgOpen}
                  gap={8}
                  className="text-[13px] leading-relaxed text-foreground/50"
                  text={hintLockedText}
                />
              )}
              <Reveal show={!!hintText && hintUnlocked && hintRevealed && boardPhase === "idle"} gap={8}>
                <p className="text-[13px] leading-relaxed text-foreground/65">{hintText}</p>
              </Reveal>
            </div>
          </Reveal>

          <div className="flex flex-col gap-2.5">
            <ProgressBar used={clearingBoard ? 0 : game.guesses.length} active={!finished && !clearingBoard} />
            <span className="text-[13px] text-foreground/50">
              {finished
                ? "Round over"
                : `${NUMBER_WORDS[guessesLeft]} guess${guessesLeft === 1 ? "" : "es"} left`}
            </span>
          </div>

          <Reveal show={hasKnownLetters(known) && boardPhase === "idle"} durationMs={550} gap={26}>
            <KnownLettersPanel known={known} />
          </Reveal>
        </aside>

        {/* center column */}
        <div className="relative flex w-full flex-1 flex-col items-center gap-6">
          {/* With a tier result, that replaces this card: desktop shows it in
              the sidebar, mobile as a sheet — this reappears on mobile only
              once the sheet is dismissed, so there's always a Next word. */}
          <Reveal
            gap={24}
            show={finished && boardPhase === "idle" && !(tierResult && resultSheetOpen)}
            // Right after the round: once the tiles settle. After closing
            // the mobile tier sheet: straight away.
            delayMs={tierResult ? 0 : RESULT_SETTLE_MS}
            className={`w-full max-w-xl ${tierResult ? "md:hidden" : ""}`}
          >
            <div
              className={`rounded-[20px] border p-4 text-center shadow-sm ${
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
                  {guest && game.timeTakenMs != null && <> · {formatDuration(game.timeTakenMs)}</>}
                </p>
              )}
              <WordMeaning meaning={game.wordMeaning} align="center" className="mx-auto mt-2 max-w-md" />
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={nextWord}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
                >
                  Next word
                </button>
                {boardLink && (
                  <button
                    type="button"
                    onClick={boardLink}
                    className="rounded-lg border border-white/12 bg-white/7 px-4 py-2 text-sm font-semibold transition-colors hover:border-accent/40"
                  >
                    {tierMe ? `${tierMe.tierName} leaderboard` : "Leaderboard"}
                  </button>
                )}
              </div>
              {guest && onLogin && <LoginPrompt onLogin={onLogin} className="mt-3.5 text-left" />}
            </div>
          </Reveal>

          {error && (
            <p key={shakeSignal} className="animate-fade-in text-sm font-medium text-danger">
              {error}
            </p>
          )}
          {waitStage === 2 && !error && (
            <p role="status" className="animate-fade-in text-sm text-foreground/55">
              Still checking your guess…
            </p>
          )}

          <div
            data-tour="play-board"
            className="relative"
            style={
              boardPhase === "leaving"
                ? { animation: `board-out ${BOARD_OUT_MS}ms ease-in both` }
                : boardPhase === "entering"
                  ? { animation: `board-in ${BOARD_IN_MS}ms cubic-bezier(0.16, 1, 0.3, 1) both` }
                  : undefined
            }
          >
            <GuessWordBoard
              guesses={game.guesses}
              currentGuess={currentGuess}
              shakeSignal={shakeSignal}
              celebrate={won && boardPhase === "idle"}
              interactive={!finished && boardPhase === "idle"}
              clearing={boardPhase === "clearing" || boardPhase === "leaving"}
              pending={waitStage > 0}
            />
            {toast && (
              <div
                key={toast.id}
                role="status"
                aria-live="polite"
                style={{
                  animation: toastClosing
                    ? `toast-out ${TOAST_OUT_MS}ms cubic-bezier(0.4, 0, 1, 1) both`
                    : // Hidden (fill: both) until the delay is up.
                      `toast-in ${TOAST_IN_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${TOAST_DELAY_MS}ms both`,
                }}
                className="pointer-events-none absolute inset-x-0 top-3 z-10 mx-auto flex w-fit max-w-[92%] items-center gap-2.5 rounded-full bg-linear-to-r from-[#f3d27a] to-[#e2a948] py-1.5 pl-1.5 pr-2 text-background shadow-lg shadow-black/35 ring-1 ring-black/10"
              >
                <span className="flex size-7.5 flex-none items-center justify-center rounded-full bg-background text-present">
                  <RepeatIcon />
                </span>
                <span className="whitespace-nowrap text-[13px] font-bold tracking-tight">{toast.title}</span>
                {toast.word && (
                  <span className="flex gap-0.75" aria-label={toast.word.toUpperCase()}>
                    {toast.word.split("").map((letter, i) => (
                      <span
                        key={i}
                        style={{ animationDelay: `${TOAST_DELAY_MS + 320 + i * 70}ms`, animationDuration: "0.45s" }}
                        className="flex size-6 animate-pop items-center justify-center rounded-md bg-background text-[11.5px] font-bold uppercase text-present"
                      >
                        {letter}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )}
          </div>

          <Reveal show={!!hintsOffNotice && boardPhase === "idle"} gap={24} className="w-full max-w-lg md:hidden">
            {hintsOffNotice}
          </Reveal>
          <Reveal show={paidTier && boardPhase === "idle"} gap={24} className="w-full max-w-lg md:hidden">
            <PaidHintRow hint={hintText} unlocked={hintUnlocked} unlockAfter={HINT_UNLOCK_ATTEMPT} state={paidHint} />
          </Reveal>

          {/* Keys lose their colours as the board clears. */}
          <Keyboard
            guesses={boardPhase === "clearing" || boardPhase === "leaving" ? [] : game.guesses}
            onKey={handleKey}
            disabled={finished || submitting || boardPhase !== "idle"}
          />
        </div>

        {/* right sidebar */}
        <aside className="hidden flex-col gap-4.5 md:flex">
          <Reveal show={finished && !!tierResult && boardPhase === "idle"} delayMs={RESULT_SETTLE_MS} from="right" gap={18}>
            {tierResult && (
              <TierResultCard
                variant="card"
                game={game}
                result={tierResult}
                me={tierMe}
                tiers={tiers}
                onNext={nextWord}
                onBoard={onOpenTierLeaderboard}
              />
            )}
          </Reveal>
          <Reveal show={!!hintsOffNotice && boardPhase === "idle"} gap={18}>{hintsOffNotice}</Reveal>
          <Reveal show={paidTier && boardPhase === "idle"} gap={18}>
            <PaidHintCard
              hint={hintText}
              unlocked={hintUnlocked}
              unlockAfter={HINT_UNLOCK_ATTEMPT}
              fromName={paidHintsFrom?.name}
              state={paidHint}
            />
          </Reveal>
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
                <span className="text-[14.5px] font-semibold">
                  {/* Finished rounds count toward the tier board. */}
                  {tierMode && tierMe ? `Counts toward ${tierMe.tierName}` : "No stats, no streak"}
                </span>
              </span>
              {!finished && (
                <button
                  type="button"
                  onClick={nextWord}
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

          {guest && onLogin && !finished && <LoginPrompt onLogin={onLogin} />}
        </aside>
      </div>

      {howToPlayOpen && <HowToPlayModal onClose={() => setHowToPlayOpen(false)} />}

      {/* mobile: tier result as a bottom sheet over the dimmed board; tap
          outside to dismiss (the regular result card then shows instead). */}
      {paidTier && <PaidHintSheets state={paidHint} tierName={tierMe?.tierName} />}

      {finished && tierResult && resultSheetOpen && boardPhase === "idle" && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end md:hidden">
          <button
            type="button"
            aria-label="Close result"
            onClick={() => setResultSheetOpen(false)}
            style={{ animationDelay: `${RESULT_SETTLE_MS}ms` }}
            className="absolute inset-0 animate-fade-in bg-[#09060b]/55"
          />
          <div className="relative animate-fade-in-up" style={{ animationDelay: `${RESULT_SETTLE_MS}ms` }}>
            <TierResultCard
              variant="sheet"
              game={game}
              result={tierResult}
              me={tierMe}
              tiers={tiers}
              onNext={nextWord}
              onBoard={onOpenTierLeaderboard}
            />
          </div>
        </div>
      )}
    </div>
  );
}
