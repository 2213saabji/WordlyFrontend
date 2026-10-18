// "Add to home screen": when to offer it, and the browser's own install
// prompt (Android/desktop Chrome). The beforeinstallprompt event is caught by
// an inline script in app/layout.tsx before React loads, and kept on window.

import { isIos, isStandalone } from "@/lib/push";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __guesswordInstallPrompt?: BeforeInstallPromptEvent;
  }
}

const DISMISSED_KEY = "guessword_install_dismissed_at";
/** After "Not now" / "Got it", don't offer again for this long. */
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export type InstallKind = "prompt" | "ios";

let gameFinishedThisVisit = false;
let offeredThisVisit = false;

/** Called by the Play screen when a round ends — the offer comes after the
 * player's first finished game of the visit. */
export function noteGameFinished(): void {
  gameFinishedThisVisit = true;
}

function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function isPhone(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse) and (max-width: 767px)").matches;
}

function isIosSafari(): boolean {
  // Other iOS browsers mark themselves (CriOS, FxiOS, EdgiOS, ...); the
  // design's steps are Safari's.
  return isIos() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(navigator.userAgent);
}

/** Which install sheet this browser can use, if any — ignoring timing. */
export function installKind(): InstallKind | null {
  if (typeof window === "undefined" || isStandalone() || !isPhone()) return null;
  if (window.__guesswordInstallPrompt) return "prompt";
  if (isIosSafari()) return "ios";
  return null;
}

/** Whether to offer it now: after a finished game, once per visit, not
 * while snoozed. Marks it offered. */
export function takeInstallOffer(): InstallKind | null {
  if (!gameFinishedThisVisit || offeredThisVisit || snoozed()) return null;
  const kind = installKind();
  if (kind) offeredThisVisit = true;
  return kind;
}

export function snoozeInstall(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Storage disabled — it'll be offered again next visit.
  }
}

/** Shows the browser's install dialog. Resolves true if the player
 * installed. The event can be used once. */
export async function promptInstall(): Promise<boolean> {
  const event = window.__guesswordInstallPrompt;
  if (!event) return false;
  window.__guesswordInstallPrompt = undefined;
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}
