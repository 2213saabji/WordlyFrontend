"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const noSubscribe = () => () => {};

/**
 * Bottom sheet on mobile, centred dialog on desktop — always in the visible
 * window. Rendered into <body> (a portal): the screen it's opened from may
 * sit inside an animated wrapper whose `transform` would otherwise become
 * the frame `position: fixed` measures against, centring the sheet on the
 * whole page (off-screen on a long one) instead of the window. The page
 * behind doesn't scroll while it's open.
 */
export function SheetFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // <body> only exists in the browser: nothing in the server render (and
  // the first client render matches it), then the portal.
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);
  if (!inBrowser) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center md:p-6"
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 animate-fade-in bg-[#09060b]/60" />
      <div className="relative flex max-h-[92dvh] animate-fade-in-up flex-col gap-[18px] overflow-y-auto overscroll-contain rounded-t-[30px] border-t border-white/10 bg-[#1f1725] px-[22px] pb-[calc(26px+env(safe-area-inset-bottom))] pt-3.5 md:max-h-[calc(100dvh-48px)] md:w-110 md:rounded-[24px] md:border md:p-7 md:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)]">
        <span aria-hidden className="h-1 w-11 self-center rounded-[3px] bg-white/18 md:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
