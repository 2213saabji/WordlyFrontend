"use client";

import { useEffect, useState } from "react";
import { promptInstall, snoozeInstall, takeInstallOffer, type InstallKind } from "@/lib/install";
import type { Screen } from "@/lib/screen-context";

// "Add GuessWord to your home screen" bottom sheet: Android/Chrome gets an
// Install button (the browser's own dialog), iPhone Safari the three Share-
// menu steps. Offered by InstallPromptHost after the player's first finished
// game of a visit, once they leave the board; Settings can open it any time.

const SOFT = "text-[#c9bfcc]";
const SECONDARY_BTN =
  "rounded-2xl border border-white/12 bg-white/7 px-5 py-4 text-[14.5px] font-semibold transition-colors hover:bg-white/10";

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#9FD4E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 flex-none">
      <path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8" />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#9FD4E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 flex-none">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

const BENEFITS = [
  "Opens full screen, one tap from your home screen",
  "Daily reminders arrive reliably",
  "Under 1 MB, no app store needed",
];

export function InstallSheet({ kind, onClose }: { kind: InstallKind; onClose: () => void }) {
  const dismiss = () => {
    snoozeInstall();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const install = () => {
    promptInstall()
      .then((installed) => {
        if (!installed) snoozeInstall();
      })
      .finally(onClose);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in flex-col justify-end bg-[rgba(9,6,11,0.6)]"
      onClick={dismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        onClick={(e) => e.stopPropagation()}
        className="mx-auto flex w-full max-w-lg animate-fade-in-up flex-col gap-5 rounded-t-[30px] border-t border-white/10 bg-[#1f1725] px-[22px] pt-3.5 pb-[calc(26px+env(safe-area-inset-bottom))]"
      >
        <span className="h-1 w-11 self-center rounded-[3px] bg-white/18" aria-hidden />

        {kind === "prompt" ? (
          <>
            <div className="flex items-center gap-4">
              <span className="flex size-16 flex-none items-center justify-center rounded-[18px] bg-accent text-[32px] font-bold text-background">
                G
              </span>
              <span id="install-title" className="font-display text-2xl font-bold leading-tight">
                Add GuessWord to your home screen
              </span>
            </div>
            <ul className={`flex flex-col gap-3 text-[13.5px] ${SOFT}`}>
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <span className="size-1.5 flex-none rounded-full bg-accent" aria-hidden />
                  {benefit}
                </li>
              ))}
            </ul>
            <div className="flex gap-2.5">
              <button type="button" onClick={dismiss} className={SECONDARY_BTN}>
                Not now
              </button>
              <button
                type="button"
                onClick={install}
                className="flex-1 rounded-2xl bg-accent p-4 text-[15.5px] font-bold text-background transition-transform duration-150 hover:-translate-y-0.5"
              >
                Install
              </button>
            </div>
          </>
        ) : (
          <>
            <span id="install-title" className="font-display text-2xl font-bold leading-tight">
              Add GuessWord to your home screen
            </span>
            <ol className="flex flex-col rounded-[18px] bg-white/4">
              {[
                { body: <>Tap <strong>Share</strong> in the Safari toolbar</>, icon: <ShareIcon /> },
                { body: <>Choose <strong>Add to Home Screen</strong></>, icon: <AddIcon /> },
                { body: <>Tap <strong>Add</strong></>, icon: null },
              ].map((step, i) => (
                <li key={i} className="flex items-center gap-3.5 border-b border-white/7 px-4 py-3.5 last:border-b-0">
                  <span className="flex size-[26px] flex-none items-center justify-center rounded-full bg-accent/15 text-[13px] font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">{step.body}</span>
                  {step.icon}
                </li>
              ))}
            </ol>
            <button type="button" onClick={dismiss} className={`${SECONDARY_BTN} text-center`}>
              Got it
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Offers the install sheet when the player comes off the board after a
 * finished game (once per visit, not while snoozed, only where installing
 * is possible). */
export function InstallPromptHost({ screen }: { screen: Screen["name"] }) {
  const [kind, setKind] = useState<InstallKind | null>(null);

  useEffect(() => {
    if (screen === "play" || kind) return;
    // A beat after the new screen settles, so it doesn't land mid-transition.
    const id = window.setTimeout(() => {
      const offer = takeInstallOffer();
      if (offer) setKind(offer);
    }, 700);
    return () => window.clearTimeout(id);
  }, [screen, kind]);

  if (!kind) return null;
  return <InstallSheet kind={kind} onClose={() => setKind(null)} />;
}
