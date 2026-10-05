"use client";

import { useEffect, useState, type ReactNode } from "react";

// Opens and closes its content smoothly instead of mounting/unmounting it in
// one frame: height (grid rows 0fr <-> 1fr), opacity and a small slide, so
// whatever sits below moves with it. While closing it keeps showing the last
// content it had, so callers can drop the children as soon as `show` goes
// false (e.g. the round state is reset mid-animation).


export default function Reveal({
  show,
  children,
  delayMs = 0,
  durationMs = 380,
  gap = 0,
  from = "up",
  className = "",
}: {
  show: boolean;
  children: ReactNode;
  /** Wait this long before opening (closing is never delayed). */
  delayMs?: number;
  durationMs?: number;
  /** The parent's flex/grid gap in px. While closed, a matching negative
   * margin cancels it, so mounting/unmounting never makes what's below jump. */
  gap?: number;
  /** Where the content slides in from. */
  from?: "up" | "right";
  className?: string;
}) {
  const [mounted, setMounted] = useState(show);
  const [opened, setOpened] = useState(false);
  // Closing starts the moment `show` goes false; `opened` is only reset
  // once the close has finished and the content unmounts.
  const open = show && opened;

  // The content shown while closing: the children from the last render
  // where `show` was true.
  const [kept, setKept] = useState<ReactNode>(children);
  if (show && kept !== children) setKept(children);

  useEffect(() => {
    if (show) {
      let frame = 0;
      const timer = setTimeout(() => {
        setMounted(true);
        // Mounted closed first, then opened on a later frame so it transitions.
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => setOpened(true));
        });
      }, delayMs);
      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(frame);
      };
    }
    const timer = setTimeout(() => {
      setMounted(false);
      setOpened(false);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [show, delayMs, durationMs]);

  if (!mounted) return null;

  const hidden = from === "right" ? "translate-x-6" : "-translate-y-1.5";

  return (
    <div
      style={{ transitionDuration: `${durationMs}ms`, marginBottom: open ? 0 : -gap }}
      className={`grid transition-[grid-template-rows,opacity,transform,margin] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] translate-0 opacity-100" : `grid-rows-[0fr] opacity-0 ${hidden}`
      } ${className}`}
    >
      <div className="min-h-0 overflow-hidden">{show ? children : kept}</div>
    </div>
  );
}
