"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { readCache, writeCache } from "@/lib/cache";
import { useScreen, type Screen } from "@/lib/screen-context";
import { usePlayState, useShareSession, type PlayState } from "@/lib/training";

// First-run training for a signed-in player whose account says
// `trainingCompleted: false`: a guided tour over the real screens — home,
// one Infinite round, today's Daily word, the leaderboard — and then
// PATCH /auth/training. Until it's done, only what the current step points
// at can be clicked (a capture-phase click filter); the screens themselves
// are unchanged and just carry `data-tour="…"` markers for the spotlight.

type Place = "home" | "hub" | "play-infinite" | "play-daily" | "leaderboard";

interface Ctx {
  play: PlayState | null;
  name: string;
  /** The account's current Daily streak. */
  streak: number;
  /** The share window is open now / has been opened during the tour. */
  shareOpen: boolean;
  shared: boolean;
}

interface Step {
  id: string;
  /** The screen this step runs on. The tour brings the player back to it. */
  on: Place;
  /** `data-tour` marker to spotlight; absent (or not on screen) = no spotlight. */
  target?: string;
  /** info: read, then the card's button. click: tap the spotlighted target
   * (which leads to the next step's screen). play: play on — only the board
   * and keyboard work — until `until` holds. finish: saves the training. */
  kind: "info" | "click" | "play" | "finish";
  title: string | ((ctx: Ctx) => string);
  body: ReactNode | ((ctx: Ctx) => ReactNode);
  button?: string | ((ctx: Ctx) => string);
  until?: (ctx: Ctx) => boolean;
  /** Wait this long before showing the step (lets a result card animate in). */
  delayMs?: number;
  /** Markers that respond to clicks, instead of the kind's default. */
  allow?: string[];
}

/** PlayScreen's HINT_UNLOCK_ATTEMPT: the bulb unlocks from this guess. */
const HINT_AFTER = 4;

const inRound = (ctx: Ctx, mode: PlayState["mode"]) => (ctx.play?.mode === mode ? ctx.play : null);
const roundOver = (ctx: Ctx, mode: PlayState["mode"]) => {
  const play = inRound(ctx, mode);
  return !!play && play.status !== "in-progress";
};

function Tile({ letter, className, small = false }: { letter: string; className: string; small?: boolean }) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-md font-bold uppercase ${
        small ? "size-6 text-[11px]" : "size-7 text-[13px]"
      } ${className}`}
    >
      {letter}
    </span>
  );
}

function ColourLegend() {
  const rows = [
    { tile: "bg-correct text-white", letter: "C", text: "Green: right letter, right spot." },
    { tile: "bg-present text-background", letter: "R", text: "Yellow: in the word, but in a different spot." },
    { tile: "bg-absent text-foreground", letter: "A", text: "Grey: not in the word at all." },
  ];
  return (
    <span className="mt-1 flex flex-col gap-2">
      {rows.map((r) => (
        <span key={r.letter} className="flex items-center gap-2.5">
          <Tile letter={r.letter} className={r.tile} />
          <span>{r.text}</span>
        </span>
      ))}
    </span>
  );
}

function StarterWords() {
  return (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {["crane", "slate", "audio", "raise"].map((w) => (
        <span key={w} className="flex gap-0.5">
          {w.split("").map((l, i) => (
            <Tile key={i} letter={l} small className="bg-white/10 text-foreground" />
          ))}
        </span>
      ))}
    </span>
  );
}

const STEPS: Step[] = [
  // --- home ---
  {
    id: "welcome",
    on: "home",
    kind: "info",
    title: ({ name }) => `Welcome to GuessWord, ${name}!`,
    body: "Here's a quick tour. You'll play one Infinite word and then today's Daily word. It takes about 3 minutes.",
    button: "Start the tour",
  },
  {
    id: "home-daily",
    on: "home",
    target: "home-daily",
    kind: "info",
    title: "Play Daily",
    body: "One new word every day, and it's the same word for everyone. Solving it keeps your streak going. You'll play it later in this tour.",
  },
  {
    id: "home-stats",
    on: "home",
    target: "home-stats",
    kind: "info",
    title: "Your stats",
    body: "Words played, win rate and best streak. They go up as you play the Daily word.",
  },
  {
    id: "home-more",
    on: "home",
    target: "home-more",
    kind: "info",
    title: "Groups & leaderboards",
    body: "Start a group to play against friends, see how you rank, and look back at the words you've played.",
  },
  {
    id: "home-infinite",
    on: "home",
    target: "home-infinite",
    kind: "click",
    title: "Now try Infinite",
    body: "Infinite has endless words, so you can play as many as you like. Tap Play Infinite.",
  },
  // --- Infinite hub ---
  {
    id: "hub-tier",
    on: "hub",
    target: "hub-tier",
    kind: "info",
    title: "Your tier",
    body: "Infinite players are ranked in tiers, from Stone at the bottom up to Diamond. Make enough days count in a row and you move up a tier.",
  },
  {
    id: "hub-today",
    on: "hub",
    target: "hub-today",
    kind: "info",
    title: "Today's target",
    body: "Hit these targets to make today count. If you miss too many days, you can drop down a tier.",
  },
  {
    id: "hub-play",
    on: "hub",
    target: "hub-play",
    kind: "click",
    title: "Start a word",
    body: "Tap the button to start your first round.",
  },
  // --- one Infinite round ---
  {
    id: "play-intro",
    on: "play-infinite",
    target: "play-board",
    kind: "info",
    title: "How to guess",
    body: (
      <>
        Find the hidden 5-letter word in 6 tries. Type any real 5-letter word and press Enter. Good first words:
        <StarterWords />
      </>
    ),
    button: "Got it",
  },
  {
    id: "play-first",
    on: "play-infinite",
    kind: "play",
    title: "Your turn",
    body: "Type a word, for example CRANE, and press Enter.",
    until: (ctx) => (inRound(ctx, "infinite")?.guesses ?? 0) >= 1 || roundOver(ctx, "infinite"),
  },
  {
    id: "play-colours",
    on: "play-infinite",
    target: "play-board",
    kind: "info",
    title: "What the colours mean",
    body: <ColourLegend />,
    button: "Keep playing",
  },
  {
    id: "play-to-hint",
    on: "play-infinite",
    kind: "play",
    title: "Keep going",
    body: `Use the colours to work out the word. Stuck? After your ${HINT_AFTER}th guess, a 💡 bulb appears with a hint.`,
    until: (ctx) => (inRound(ctx, "infinite")?.guesses ?? 0) >= HINT_AFTER || roundOver(ctx, "infinite"),
  },
  {
    id: "play-hint",
    on: "play-infinite",
    target: "hint-bulb",
    kind: "click",
    title: "Your hint is ready",
    body: "Tap the 💡 bulb to see a hint about the word. In higher tiers, hints cost coins.",
    // Done once it's open. Skipped if the round is over, or this tier has
    // no free bulb (paid hints or none).
    until: (ctx) => {
      const play = inRound(ctx, "infinite");
      return !play || play.status !== "in-progress" || play.hintRevealed || !play.hintBulb;
    },
  },
  {
    id: "play-finish",
    on: "play-infinite",
    kind: "play",
    title: "Finish the round",
    body: "The round ends when you solve the word or use all 6 tries.",
    until: (ctx) => roundOver(ctx, "infinite"),
  },
  {
    id: "play-result",
    on: "play-infinite",
    target: "tier-result",
    kind: "info",
    delayMs: 1200,
    title: (ctx) => (inRound(ctx, "infinite")?.status === "won" ? "You earned coins 🪙" : "Round over"),
    body: (ctx) =>
      inRound(ctx, "infinite")?.status === "won"
        ? "Every Infinite word you solve earns you coins and points for your tier. Spend coins on hints when you're stuck."
        : "You earn coins when you solve a word, so there are none this time. Every finished round still counts toward today's target.",
  },
  {
    id: "play-tiers",
    on: "play-infinite",
    target: "tier-result",
    kind: "info",
    title: "Climbing the tiers",
    body: "Points rank you against everyone in your tier. Make enough days count in a row to move up, all the way to Diamond.",
  },
  {
    id: "go-daily",
    on: "play-infinite",
    kind: "info",
    title: "Now the Daily word",
    body: "Last stop: today's Daily word. Everyone gets the same word, and you get one go a day.",
    button: "Play Daily",
  },
  // --- today's Daily word: the player's own game ---
  {
    id: "daily-intro",
    on: "play-daily",
    kind: "info",
    title: (ctx) => (roundOver(ctx, "daily") ? "You've played today's word" : "Today's Daily word"),
    body: (ctx) =>
      roundOver(ctx, "daily")
        ? "Your result for today is already in. Let's look at what it shows."
        : "You're on your own for this one. Solve it to keep your streak going and to get on today's leaderboard. Good luck!",
    button: (ctx) => (roundOver(ctx, "daily") ? "Next" : "Start"),
  },
  {
    id: "daily-play",
    on: "play-daily",
    kind: "play",
    title: "Daily word",
    body: "Solve today's word. When you're done, we'll go over your result.",
    until: (ctx) => roundOver(ctx, "daily"),
  },
  {
    id: "daily-streak",
    on: "play-daily",
    target: "daily-streak",
    kind: "info",
    delayMs: 1200,
    title: (ctx) => {
      if (inRound(ctx, "daily")?.status !== "won") return "Your streak";
      return ctx.streak === 1 ? "Your first streak! 🔥" : `${ctx.streak} day streak 🔥`;
    },
    body: (ctx) => {
      if (inRound(ctx, "daily")?.status !== "won") {
        return "No streak this time. Your streak starts the day you solve the Daily word, and grows by one for every day in a row you solve it.";
      }
      return ctx.streak === 1
        ? "You solved today's word, so your streak has started at 1 day. Solve the Daily word again tomorrow to make it 2. Miss a day and it goes back to 0."
        : `You've solved the Daily word ${ctx.streak} days in a row. Solve it again tomorrow to keep it going. Miss a day and it goes back to 0.`;
    },
  },
  {
    id: "daily-meaning",
    on: "play-daily",
    target: "daily-meaning",
    kind: "info",
    title: "Word meaning",
    body: "Once a round is over, you can see what the word means, so you learn a new word every day.",
  },
  {
    // Optional: tapping Share result runs SHARE_STEPS over the share window;
    // closing it (or Not now) moves on to the leaderboard.
    id: "daily-share",
    on: "play-daily",
    target: "daily-share",
    kind: "info",
    allow: ["daily-share"],
    title: "Share your result",
    body: "Tap Share result to send your score to friends as text, an image or a link. It only shows your coloured squares, never the word, so it won't spoil it for them. Sharing is optional.",
    button: "Not now",
    until: (ctx) => ctx.shared && !ctx.shareOpen,
  },
  {
    id: "daily-board",
    on: "play-daily",
    target: "daily-leaderboard",
    kind: "click",
    allow: ["daily-leaderboard", "daily-share"],
    title: "See where you rank",
    body: "Tap Leaderboard to see today's results.",
  },
  // --- leaderboard ---
  {
    id: "lb-list",
    on: "leaderboard",
    target: "lb-list",
    kind: "info",
    title: "The leaderboard",
    body: "Everyone who played today's word is ranked here, and your own row is highlighted.",
  },
  {
    id: "lb-controls",
    on: "leaderboard",
    target: "lb-controls",
    kind: "info",
    title: "Daily, weekly, groups & Infinite",
    body: "Use these to switch between today and this week, or between Global, your groups and the Infinite tier boards.",
  },
  {
    id: "done",
    on: "leaderboard",
    kind: "finish",
    title: "You're all set! 🎉",
    body: "That's the tour. A new Daily word arrives every day, and you can keep climbing the tiers in Infinite.",
    button: "Finish",
  },
];

/** The optional share tour: runs over the share window while it's open on
 * the daily-share / daily-board steps, then hands back to them. Everything
 * in the window can be tried out. */
const SHARE_STEPS: Step[] = [
  {
    id: "share-tabs",
    on: "play-daily",
    target: "share-tabs",
    kind: "info",
    allow: ["share-modal"],
    title: "Three ways to share",
    body: "Text copies your coloured squares to paste anywhere. Image makes a picture for stories and chats. Link lets friends play today's word too.",
  },
  {
    id: "share-close",
    on: "play-daily",
    target: "share-close",
    kind: "click",
    allow: ["share-modal"],
    title: "Try it out",
    body: "Copy or share your result if you like. Close this window when you're done.",
  },
];
const SHARE_TOUR_STEPS = new Set(["daily-share", "daily-board"]);

function placeOf(screen: Screen): Place | null {
  switch (screen.name) {
    case "home":
      return "home";
    case "infinite-hub":
      return "hub";
    case "play":
      return screen.mode === "daily" ? "play-daily" : "play-infinite";
    case "leaderboard":
      return "leaderboard";
    default:
      return null;
  }
}

// Both live in the per-user cache (lib/cache.ts), which is cleared when the
// session ends: progress survives a reload, but logging out and back in
// starts the tour over — and brings it back after a Skip intro, until the
// backend says the training is complete.
const stepKey = (userId: string) => `training-step:${userId}`;
const skippedKey = (userId: string) => `training-skipped:${userId}`;

function readStep(userId: string): number {
  const id = readCache<string>(stepKey(userId));
  const at = STEPS.findIndex((s) => s.id === id);
  return at >= 0 ? at : 0;
}

function writeStep(userId: string, index: number) {
  writeCache(stepKey(userId), STEPS[index].id);
}

/** The visible element carrying `data-tour~=key` (screens render separate
 * mobile and desktop copies; the hidden one measures 0×0). */
function findTarget(key: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour~="${key}"]`)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

type Rect = { top: number; left: number; width: number; height: number };
type CardPos = { top?: number; bottom?: number; left: number; width: number; centered?: boolean };
/** The "Tap here" pointer on a click step: just above the target pointing
 * down, or just below it pointing up. */
type TapPos = { top: number; left: number; dir: "down" | "up" };
type Layout = { spot: Rect | null; card: CardPos; tap?: TapPos | null };

const PAD = 8;
const GAP = 14;
const EDGE = 12;
const CARD_WIDTH = 360;
const MOBILE = 768;
const TAP_W = 116;
const TAP_H = 34;
const TAP_GAP = 6;

function sameLayout(a: Layout | null, b: Layout) {
  if (!a) return false;
  const s = a.spot,
    t = b.spot;
  const spotSame =
    s === t || (!!s && !!t && s.top === t.top && s.left === t.left && s.width === t.width && s.height === t.height);
  const c = a.card,
    d = b.card;
  const p = a.tap,
    q = b.tap;
  const tapSame = p === q || (!!p && !!q && p.top === q.top && p.left === q.left && p.dir === q.dir);
  return (
    spotSame &&
    tapSame &&
    c.top === d.top &&
    c.bottom === d.bottom &&
    c.left === d.left &&
    c.width === d.width &&
    c.centered === d.centered
  );
}

/** Where the pointer fits without leaving the screen or covering the card;
 * null if it fits nowhere (the ring still pulses). */
function placeTap(spot: Rect, card: CardPos, cardHeight: number): TapPos | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.round(Math.min(Math.max(spot.left + spot.width / 2 - TAP_W / 2, EDGE), vw - TAP_W - EDGE));
  const cardTop = card.top ?? vh - (card.bottom ?? 0) - cardHeight;
  const clear = (top: number) =>
    top >= EDGE &&
    top + TAP_H <= vh - EDGE &&
    !(top < cardTop + cardHeight && top + TAP_H > cardTop && left < card.left + card.width && left + TAP_W > card.left);
  const above = spot.top - TAP_GAP - TAP_H;
  if (clear(above)) return { top: above, left, dir: "down" };
  const below = spot.top + spot.height + TAP_GAP;
  if (clear(below)) return { top: below, left, dir: "up" };
  return null;
}

function computeLayout(target: HTMLElement | null, cardHeight: number, kind: Step["kind"]): Layout {
  const layout = placeCard(target, cardHeight, kind);
  if (kind === "click" && layout.spot) layout.tap = placeTap(layout.spot, layout.card, cardHeight);
  return layout;
}

function placeCard(target: HTMLElement | null, cardHeight: number, kind: Step["kind"]): Layout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw < MOBILE;
  const width = mobile ? vw - EDGE * 2 : Math.min(CARD_WIDTH, vw - EDGE * 2);
  const r = target?.getBoundingClientRect();
  const spot = r
    ? {
        top: Math.round(r.top - PAD),
        left: Math.round(r.left - PAD),
        width: Math.round(r.width + PAD * 2),
        height: Math.round(r.height + PAD * 2),
      }
    : null;

  if (!spot) {
    // While playing: out of the board's way. Otherwise: centred.
    if (kind === "play") return { spot, card: mobile ? { top: EDGE, left: EDGE, width } : { bottom: 24, left: 24, width } };
    return { spot, card: { top: Math.round((vh - cardHeight) / 2), left: Math.round((vw - width) / 2), width, centered: true } };
  }

  if (mobile) {
    // Full width, on whichever half of the screen the target isn't.
    const targetLow = spot.top + spot.height / 2 > vh / 2;
    return { spot, card: targetLow ? { top: EDGE, left: EDGE, width } : { bottom: EDGE, left: EDGE, width } };
  }

  const left = Math.round(Math.min(Math.max(spot.left, EDGE), vw - width - EDGE));
  if (spot.top + spot.height + GAP + cardHeight <= vh - EDGE) return { spot, card: { top: spot.top + spot.height + GAP, left, width } };
  if (spot.top - GAP - cardHeight >= EDGE) return { spot, card: { top: spot.top - GAP - cardHeight, left, width } };
  // Too tall to go above or below: beside it, else the bottom corner.
  const top = Math.round(Math.min(Math.max(spot.top, EDGE), vh - cardHeight - EDGE));
  if (spot.left + spot.width + GAP + width <= vw - EDGE) return { spot, card: { top, left: spot.left + spot.width + GAP, width } };
  if (spot.left - GAP - width >= EDGE) return { spot, card: { top, left: spot.left - GAP - width, width } };
  return { spot, card: { bottom: 24, left: vw - width - 24, width } };
}

/** Mounted by the signed-in app (GameApp's AppShell); renders nothing once
 * the account's training is complete. */
export default function Training() {
  const { user, userConfirmed } = useAuth();
  const [skippedNow, setSkippedNow] = useState<string | null>(null);
  // Only an explicit false from the server (not a stale cached user, and not
  // an older backend without the field) starts the tour.
  if (!user || !userConfirmed || user.trainingCompleted !== false) return null;
  // Skip intro: hidden for the rest of this session only — nothing is saved
  // to the backend.
  if (skippedNow === user.id || readCache<boolean>(skippedKey(user.id))) return null;
  const skip = () => {
    writeCache(skippedKey(user.id), true);
    setSkippedNow(user.id);
  };
  return <Tour key={user.id} userId={user.id} name={user.username?.trim() || "there"} onSkip={skip} />;
}

function Tour({ userId, name, onSkip }: { userId: string; name: string; onSkip: () => void }) {
  const { completeTraining, user } = useAuth();
  const { screen, push, reset } = useScreen();
  const play = usePlayState();
  // The last step the player moved past themselves (persisted, so a reload
  // resumes there). The step on screen can be further on — see below.
  const [stored, setStored] = useState(() => readStep(userId));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Per-step UI state, tagged with the step it belongs to so a new step
  // starts clean without resetting anything in an effect.
  const [readyId, setReadyId] = useState<string | null>(null);
  const [missingId, setMissingId] = useState<string | null>(null);
  const [layout, setLayout] = useState<(Layout & { id: string }) | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const share = useShareSession();
  const [shared, setShared] = useState(false);
  if (share !== null && !shared) setShared(true);
  // Where the share tour is, for the share window open right now.
  const [shareAt, setShareAt] = useState<{ session: number; i: number } | null>(null);

  const ctx: Ctx = { play, name, streak: user?.stats.currentStreak ?? 0, shareOpen: share !== null, shared };
  const place = placeOf(screen);

  // Steps the game or the player has already moved past: a round that's
  // over (play steps), or the screen a tapped target led to (click steps).
  let index = stored;
  while (index < STEPS.length - 1) {
    const s = STEPS[index];
    if (s.until?.(ctx) || (s.kind === "click" && place !== s.on && place === STEPS[index + 1].on)) index++;
    else break;
  }
  // Keep what the walk passed. A play step only counts as done while its
  // round is on screen, so leaving it (e.g. tapping Leaderboard once the
  // Daily word is over) would otherwise bring the player back to it.
  if (index > stored) setStored(index);
  useEffect(() => writeStep(userId, stored), [userId, stored]);

  const sharing = share !== null && SHARE_TOUR_STEPS.has(STEPS[index].id);
  const shareI = sharing && shareAt?.session === share ? shareAt.i : 0;
  const step = sharing ? SHARE_STEPS[shareI] : STEPS[index];
  const ready = !step.delayMs || readyId === step.id;
  const missingTarget = missingId === step.id;

  const advance = () => {
    if (sharing && share !== null) setShareAt({ session: share, i: Math.min(shareI + 1, SHARE_STEPS.length - 1) });
    else setStored(Math.min(index + 1, STEPS.length - 1));
  };

  const goTo = useCallback(
    (to: Place) => {
      reset();
      if (to === "hub" || to === "play-infinite") push({ name: "infinite-hub" });
      if (to === "play-infinite") push({ name: "play", mode: "infinite" });
      if (to === "play-daily") push({ name: "play", mode: "daily" });
      if (to === "leaderboard") push({ name: "leaderboard" });
    },
    [push, reset],
  );

  // Keep the player on the step's screen: a reload, a deep link or the
  // promotion screen's buttons all land back where the step is.
  useEffect(() => {
    if (place !== step.on) goTo(step.on);
  }, [place, step.on, goTo]);

  // A step with a delay shows once it's up.
  useEffect(() => {
    if (!step.delayMs) return;
    const id = window.setTimeout(() => setReadyId(step.id), step.delayMs);
    return () => window.clearTimeout(id);
  }, [step]);

  // A tap target that never shows up (failed load, unexpected screen state)
  // mustn't trap the player: after a while the card offers to move on.
  useEffect(() => {
    if (step.kind !== "click" || !ready) return;
    const id = window.setTimeout(() => {
      if (!step.target || !findTarget(step.target)) setMissingId(step.id);
    }, 4_000);
    return () => window.clearTimeout(id);
  }, [step, ready]);

  // Follow the target every frame (it scrolls, animates in, re-renders).
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let scrolled = false;
    const tick = () => {
      const el = step.target ? findTarget(step.target) : null;
      if (el && !scrolled) {
        scrolled = true;
        const r = el.getBoundingClientRect();
        if (r.top < 72 || r.bottom > window.innerHeight - 24) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      const next = { ...computeLayout(el, cardRef.current?.offsetHeight ?? 0, step.kind), id: step.id };
      setLayout((prev) => (prev?.id === next.id && sameLayout(prev, next) ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, step]);

  // The click lock: only the card, the step's target (or the board, keyboard
  // and hint bulb while playing) and anything marked data-tour-allow respond.
  useEffect(() => {
    const allowed = step.allow
      ? step.allow
      : step.kind === "click" && step.target
        ? [step.target]
        : step.kind === "play"
          ? ["keyboard", "play-board", "hint-bulb", "hint-locked"]
          : [];
    const onClick = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("[data-tour-card], [data-tour-allow]")) return;
      if (ready && allowed.some((key) => t.closest(`[data-tour~="${key}"]`))) return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [step, ready]);

  // Only Finish tells the backend; the tour unmounts once the returned user
  // says it's complete.
  async function finish() {
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      await completeTraining();
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }

  if (!ready) return null;

  const resolve = <T,>(v: T | ((c: Ctx) => T)) => (typeof v === "function" ? (v as (c: Ctx) => T)(ctx) : v);
  const title = resolve(step.title);
  const body = resolve(step.body);
  const dim = step.kind !== "play";
  const current = layout?.id === step.id ? layout : null;
  const spot = current?.spot ?? null;
  const card = current?.card;
  const tap = current?.tap ?? null;
  const stepNumber = index + 1;
  // A step that waits for a tap on its target has no button of its own, so
  // the target gets all the attention: it pulses, a pointer marks it, and
  // Skip intro stays out of the way (it'd be the only other thing to press).
  const mustTap = step.kind === "click" && !missingTarget;
  const tapping = mustTap && !!spot;

  let action: ReactNode = null;
  if (step.kind === "info") {
    action = (
      <button type="button" onClick={advance} className={PRIMARY}>
        {step.button ? resolve(step.button) : "Next"}
      </button>
    );
  } else if (step.kind === "finish") {
    action = (
      <button type="button" onClick={finish} disabled={saving} className={PRIMARY}>
        {saving ? "Saving…" : step.button ? resolve(step.button) : "Finish"}
      </button>
    );
  } else if (step.kind === "click" && missingTarget && !sharing) {
    action = (
      <button type="button" onClick={advance} className={PRIMARY}>
        Continue
      </button>
    );
  } else if (tapping) {
    action = (
      <span className="flex w-full items-center gap-2 rounded-xl bg-accent/12 px-3 py-2 text-[13px] font-semibold text-accent">
        <span aria-hidden="true" className="inline-block animate-tour-nudge-up">
          👆
        </span>
        Tap the highlighted button to continue
      </span>
    );
  }

  return (
    <>
      {/* Visual only — clicks go through to the page, where the lock above
          decides what may respond. */}
      {dim && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-60">
          {spot ? (
            <div
              className={`absolute rounded-2xl border-accent transition-all duration-300 ease-out ${
                tapping ? "border-[3px]" : "border-2"
              }`}
              style={{ ...spot, boxShadow: "0 0 0 9999px rgba(9, 6, 11, 0.66)" }}
            >
              {tapping && (
                <span className="absolute -inset-0.75 animate-tour-ripple rounded-2xl border-[3px] border-accent opacity-0" />
              )}
            </div>
          ) : (
            <div className="absolute inset-0 animate-fade-in bg-[#09060b]/66" />
          )}
          {tapping && tap && (
            <div
              className="absolute flex animate-fade-in justify-center transition-all duration-300 ease-out"
              style={{ top: tap.top, left: tap.left, width: TAP_W, height: TAP_H }}
            >
              <span
                className={`flex items-center gap-1.5 rounded-full bg-accent px-3.5 text-[13px] font-bold text-background shadow-lg shadow-accent/40 ${
                  tap.dir === "down" ? "animate-tour-nudge-down" : "animate-tour-nudge-up"
                }`}
              >
                <span>{tap.dir === "down" ? "👇" : "👆"}</span>
                Tap here
              </span>
            </div>
          )}
        </div>
      )}

      <div
        key={step.id}
        ref={cardRef}
        data-tour-card
        role="dialog"
        aria-live="polite"
        aria-label={title}
        className={`fixed z-61 flex flex-col gap-3 rounded-[22px] border border-accent/30 bg-[#1f1725] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.75)] ${
          step.kind === "play" ? "p-4" : "p-5"
        } ${card ? "animate-fade-in" : "opacity-0"}`}
        style={card ? { top: card.top, bottom: card.bottom, left: card.left, width: card.width } : { top: 0, left: 0, width: CARD_WIDTH }}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              {sharing ? `Optional · Share ${shareI + 1} of ${SHARE_STEPS.length}` : `Training · ${stepNumber} of ${STEPS.length}`}
            </span>
            {step.kind !== "finish" && !mustTap && (
              <button
                type="button"
                onClick={onSkip}
                disabled={saving}
                className="-my-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-foreground/55 transition-colors hover:bg-white/8 hover:text-foreground disabled:opacity-60"
              >
                Skip intro
              </button>
            )}
          </div>
          <span className="h-1 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${(stepNumber / STEPS.length) * 100}%` }}
            />
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={`font-bold tracking-tight ${step.kind === "play" ? "text-[15px]" : "text-[17px]"}`}>{title}</span>
          <div className="text-sm leading-relaxed text-foreground/75">{body}</div>
        </div>
        {saveError && <p className="text-[13px] text-danger">Couldn&apos;t save that. Check your connection and try again.</p>}
        {action && <div className="flex justify-end">{action}</div>}
      </div>
    </>
  );
}

const PRIMARY =
  "rounded-xl bg-accent px-4.5 py-2.5 text-sm font-bold text-background shadow-sm shadow-accent/30 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] disabled:opacity-60";
