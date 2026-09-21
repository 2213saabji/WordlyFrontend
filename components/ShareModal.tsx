"use client";

import { useEffect, useRef, useState } from "react";
import { getMyGroups } from "@/lib/api";
import { buildReplayLink, buildShareText, resultRows } from "@/lib/share";
import { canvasToPngBlob, IMAGE_DIMENSIONS, renderShareImage, type ImageFormat } from "@/lib/share-image";
import type { Game, Group, User } from "@/types";

type Tab = "text" | "image" | "link";

const TILE_BG: Record<number, string> = { 1: "bg-correct", "-1": "bg-present", 0: "bg-absent" };
const MAX_ATTEMPTS = 6;

// Always renders MAX_ATTEMPTS rows — rows past the last guess show as empty
// pending cells, matching the board and the share image instead of the
// preview trailing off short on a quick win.
function MiniGrid({ rows, tileSize = 20 }: { rows: number[][]; tileSize?: number }) {
  return (
    <div className="grid gap-1.5">
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => rows[i]).map((row, i) => (
        <div key={i} className="flex gap-1.5">
          {row
            ? row.map((value, j) => (
                <span
                  key={j}
                  className={`rounded-[5px] ${TILE_BG[value]}`}
                  style={{ width: tileSize, height: tileSize }}
                />
              ))
            : Array.from({ length: 5 }, (_, j) => (
                <span
                  key={j}
                  className="rounded-[5px] border border-white/15 bg-white/5"
                  style={{ width: tileSize, height: tileSize }}
                />
              ))}
        </div>
      ))}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.75 w-3.75">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="h-4 w-4">
      <rect x="9" y="9" width="12" height="12" rx="3" />
      <path d="M15 5H6a3 3 0 0 0-3 3v9" />
    </svg>
  );
}

function GroupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function OtherAppsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-4.25 w-4.25 text-foreground/60">
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M12 3v13M8 7l4-4 4 4" />
    </svg>
  );
}

export default function ShareModal({
  game,
  user,
  wordNumber,
  onClose,
}: {
  game: Game;
  user: User;
  wordNumber: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("text");
  const [groups, setGroups] = useState<Group[]>([]);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [postFeedback, setPostFeedback] = useState<string | null>(null);
  const [imageFormat, setImageFormat] = useState<ImageFormat>("square");
  const [replayEnabled, setReplayEnabled] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    getMyGroups()
      .then(({ groups }) => setGroups(groups))
      .catch(() => setGroups([]));
  }, []);

  const rows = resultRows(game);
  const shareText = buildShareText(game, wordNumber);
  const replayLink = buildReplayLink(wordNumber, user.username);
  const dateShort = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${game.date}T00:00:00Z`));

  useEffect(() => {
    if (tab !== "image" || !canvasRef.current) return;
    renderShareImage(
      canvasRef.current,
      { rows, wordNumber, dateShort, attempts: game.guesses.length, username: user.username, streak: user.stats.currentStreak },
      imageFormat,
    );
  }, [tab, imageFormat, rows, wordNumber, dateShort, game.guesses.length, user.username, user.stats.currentStreak]);

  async function copyText(text: string, setFlag: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setFlag(true);
      setTimeout(() => setFlag(false), 1500);
    } catch {
      // Clipboard can be blocked (permissions, non-secure context) — nothing to fall back to.
    }
  }

  async function handlePostTo(label: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: shareText, title: "Wordly" });
        return;
      } catch {
        // User dismissed the OS share sheet, or it failed — fall back to clipboard below.
      }
    }
    await navigator.clipboard.writeText(shareText).catch(() => undefined);
    setPostFeedback(label);
    setTimeout(() => setPostFeedback(null), 1500);
  }

  async function handleCopyImage() {
    if (!canvasRef.current) return;
    try {
      const blob = await canvasToPngBlob(canvasRef.current);
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 1500);
    } catch {
      // Clipboard image writes need a secure context + browser support — nothing to fall back to.
    }
  }

  async function handleDownloadImage() {
    if (!canvasRef.current) return;
    const blob = await canvasToPngBlob(canvasRef.current);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wordly-${wordNumber}-${imageFormat}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const dims = IMAGE_DIMENSIONS[imageFormat];

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto scrollbar-none bg-background/95 p-4 backdrop-blur-sm [&::-webkit-scrollbar]:hidden">
      <div className="flex w-full max-w-xl animate-fade-in-up flex-col gap-6 rounded-[26px] border border-white/10 bg-surface p-7.5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span className="text-xl font-semibold tracking-tight">Share your result</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-8 w-8 flex-none items-center justify-center rounded-[11px] bg-white/7 text-foreground/60 transition-colors hover:bg-white/12 hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex gap-1 rounded-[14px] border border-white/8 bg-white/5 p-1">
          {(["text", "image", "link"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-[10px] py-2.25 text-[13.5px] font-semibold capitalize transition-colors ${
                tab === t ? "bg-accent text-background" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "text" && (
          <>
            <div className="flex items-start gap-6 rounded-[22px] border border-white/9 bg-white/5 p-6">
              <div className="flex flex-col gap-3.5">
                <span className="text-[15.5px] font-semibold">
                  Wordly {wordNumber} &nbsp;{game.guesses.length}/6
                </span>
                <MiniGrid rows={rows} />
                <span className="text-[13px] text-foreground/50">
                  wordly.app · {user.stats.currentStreak} day streak
                </span>
              </div>
              <div className="ml-auto flex flex-col items-end gap-3">
                <button
                  type="button"
                  onClick={() => copyText(shareText, setCopiedText)}
                  className="flex items-center gap-2 whitespace-nowrap rounded-[13px] bg-accent/15 px-4 py-2.75 text-sm font-semibold text-accent transition-colors hover:bg-accent/25"
                >
                  <CopyIcon />
                  {copiedText ? "Copied!" : "Copy text"}
                </button>
                <span className="max-w-35 text-right text-[12.5px] text-foreground/50">
                  The word itself is never included
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/50">Post to</span>
              <div className="flex flex-wrap gap-3">
                {groups.map((group) => (
                  <button
                    key={group._id}
                    type="button"
                    onClick={() => handlePostTo(group.name)}
                    className="flex items-center gap-2.5 whitespace-nowrap rounded-[14px] border border-white/10 bg-white/7 px-4.5 py-3.25 text-sm font-semibold transition-colors hover:bg-white/12"
                  >
                    <GroupIcon className="h-4.25 w-4.25 text-accent" />
                    {postFeedback === group.name ? "Copied!" : group.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePostTo("Other apps")}
                  className="flex items-center gap-2.5 whitespace-nowrap rounded-[14px] border border-white/10 bg-white/7 px-4.5 py-3.25 text-sm font-semibold transition-colors hover:bg-white/12"
                >
                  <OtherAppsIcon />
                  {postFeedback === "Other apps" ? "Copied!" : "Other apps"}
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "image" && (
          <>
            <div className="flex flex-col items-center gap-4 rounded-[24px] border border-white/9 bg-[#241b2b] p-6">
              <canvas
                ref={canvasRef}
                className="w-full max-w-xs rounded-2xl"
                style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 rounded-xl border border-white/8 bg-white/5 p-1">
                {(["square", "story"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setImageFormat(f)}
                    className={`rounded-[9px] px-3.5 py-2 text-[13px] font-semibold capitalize transition-colors ${
                      imageFormat === f ? "bg-white/10 text-foreground" : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <span className="text-[12.5px] text-foreground/50">
                PNG · {dims.width} × {dims.height}
              </span>
              <div className="ml-auto flex gap-3">
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="whitespace-nowrap rounded-[14px] border border-white/12 bg-white/7 px-5 py-3.25 text-sm font-semibold transition-colors hover:bg-white/12"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="flex items-center gap-2 whitespace-nowrap rounded-[14px] bg-accent px-5 py-3.25 text-sm font-bold text-background transition-transform hover:-translate-y-0.5"
                >
                  <CopyIcon />
                  {copiedImage ? "Copied!" : "Copy image"}
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "link" && (
          <>
            <div className="flex items-center gap-3 rounded-2xl border border-white/9 bg-white/5 py-2 pl-4.5 pr-2">
              <span className="select-text overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm tracking-wide text-foreground">
                {replayEnabled ? replayLink.replace(/^https?:\/\//, "") : "Link sharing is off"}
              </span>
              <button
                type="button"
                disabled={!replayEnabled}
                onClick={() => copyText(replayLink, setCopiedLink)}
                className="ml-auto flex items-center gap-2 whitespace-nowrap rounded-xl bg-accent px-4 py-2.75 text-sm font-bold text-background transition-transform hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
              >
                <CopyIcon />
                {copiedLink ? "Copied!" : "Copy link"}
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/50">Preview</span>
              <div className="flex gap-4 rounded-[18px] border border-white/9 bg-white/5 p-4.5">
                <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[14px] bg-accent/15 text-[22px] font-bold text-accent">
                  {game.guesses.length}/6
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15.5px] font-semibold">
                    {user.username} solved Wordly {wordNumber} in {game.guesses.length}
                  </span>
                  <span className="text-[13.5px] leading-snug text-foreground/60">
                    Play today&apos;s word before the link expires at midnight.
                  </span>
                  <span className="text-[12.5px] text-foreground/50">wordly.app</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4.25 py-3.75">
              <span className="flex flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold">Let friends replay this word</span>
                <span className="text-[12.5px] text-foreground/50">Opens the same board for anyone with the link</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={replayEnabled}
                onClick={() => setReplayEnabled((v) => !v)}
                className={`flex h-6.75 w-11.5 flex-none items-center rounded-full p-0.75 transition-colors ${
                  replayEnabled ? "justify-end bg-accent" : "justify-start bg-white/15"
                }`}
              >
                <span className="h-5.25 w-5.25 rounded-full bg-background" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
