"use client";

import { useEffect, useState } from "react";
import {
  getGlobalDailyLeaderboard,
  getGlobalWeeklyLeaderboard,
  getGroupDailyLeaderboard,
  getGroupWeeklyLeaderboard,
  getMyGroups,
  ApiRequestError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import type { Group } from "@/types";

type Period = "daily" | "weekly";

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
];

type NormalizedEntry = {
  userId: string;
  username: string;
  statLine: string;
  columns: [string, string, string];
};

type NormalizedData = {
  subtitle: string;
  columnHeaders: [string, string, string];
  entries: NormalizedEntry[];
};

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatDateLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ScopeSwitcher({
  currentLabel,
  groups,
  onSelectGlobal,
  onSelectGroup,
}: {
  currentLabel: string;
  groups: Group[] | null;
  onSelectGlobal: () => void;
  onSelectGroup: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground/70 transition-colors duration-150 hover:text-foreground"
      >
        <span className="max-w-36 truncate">{currentLabel}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 animate-fade-in-up overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
            <button
              type="button"
              onClick={() => {
                onSelectGlobal();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-accent transition-colors duration-150 hover:bg-background"
            >
              🌍 Global
            </button>
            {groups && groups.length > 0 && <div className="border-t border-border" />}
            {(groups ?? []).map((g) => (
              <button
                key={g._id}
                type="button"
                onClick={() => {
                  onSelectGroup(g._id);
                  setOpen(false);
                }}
                className="block w-full truncate px-4 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-background"
              >
                {g.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PeriodToggle({
  options,
  value,
  onChange,
}: {
  options: { key: Period; label: string }[];
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-colors duration-150 ${
            value === opt.key ? "bg-accent text-background" : "text-foreground/65 hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  isMe,
  delayMs = 0,
}: {
  entry: NormalizedEntry;
  rank: number;
  isMe: boolean;
  delayMs?: number;
}) {
  const first = rank === 1;
  const label = first ? "1st place" : rank === 2 ? "2nd" : "3rd";

  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={`flex animate-fade-in-up flex-col gap-3.5 rounded-3xl border p-6 ${first ? "" : "mt-6"} ${
        first ? "border-accent/35 bg-accent/10" : isMe ? "border-accent/25 bg-accent/6" : "border-border bg-surface"
      }`}
    >
      <span className={`text-xs font-semibold ${first ? "text-accent" : "text-foreground/50"}`}>{label}</span>
      <span className="flex items-center gap-3">
        <span
          className={`flex shrink-0 items-center justify-center rounded-xl font-bold ${
            first ? "size-11 bg-accent text-lg text-background" : "size-9 bg-white/10 text-sm"
          } ${isMe && !first ? "bg-accent/20 text-accent" : ""}`}
        >
          {initial(entry.username)}
        </span>
        <span className={`truncate font-semibold ${first ? "text-xl" : "text-[17px]"} ${isMe ? "text-accent" : ""}`}>
          {entry.username}
          {isMe && <span className="font-normal opacity-70"> · you</span>}
        </span>
      </span>
      <span className={`text-[13.5px] ${first ? "text-foreground/85" : "text-foreground/60"}`}>{entry.statLine}</span>
    </div>
  );
}

export default function Leaderboard({
  groupId,
  onBack,
  onSwitchScope,
}: {
  groupId?: string;
  onBack: () => void;
  onSwitchScope: (groupId?: string) => void;
}) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("daily");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [data, setData] = useState<NormalizedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyGroups()
      .then(({ groups }) => setGroups(groups))
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setData(null);
      setError(null);
      try {
        let normalized: NormalizedData;

        if (groupId) {
          if (period === "daily") {
            const res = await getGroupDailyLeaderboard(groupId);
            normalized = {
              subtitle: formatDateLabel(res.date),
              columnHeaders: ["Result", "Guesses", "Time"],
              entries: res.leaderboard.map((e) => ({
                userId: e.userId,
                username: e.username,
                statLine: `${e.status === "won" ? "Won" : "Lost"} · ${e.attemptsUsed} guesses · ${formatDuration(e.timeTakenMs)}`,
                columns: [e.status === "won" ? "Won" : "Lost", String(e.attemptsUsed), formatDuration(e.timeTakenMs)],
              })),
            };
          } else {
            const res = await getGroupWeeklyLeaderboard(groupId);
            normalized = {
              subtitle: `Week of ${formatDateLabel(res.week.start)}`,
              columnHeaders: ["Won", "Avg guesses", "Avg time"],
              entries: res.leaderboard.map((e) => ({
                userId: e.userId,
                username: e.username,
                statLine: `${e.gamesWon}/${e.gamesPlayed} wins${e.avgAttempts != null ? ` · avg ${e.avgAttempts.toFixed(1)}g` : ""}`,
                columns: [
                  `${e.gamesWon}/${e.gamesPlayed}`,
                  e.avgAttempts != null ? e.avgAttempts.toFixed(1) : "—",
                  formatDuration(e.avgTimeMs),
                ],
              })),
            };
          }
        } else if (period === "weekly") {
          const res = await getGlobalWeeklyLeaderboard();
          normalized = {
            subtitle: `Week of ${formatDateLabel(res.week.start)}`,
            columnHeaders: ["Won", "Avg guesses", "Avg time"],
            entries: res.leaderboard.map((e) => ({
              userId: e.userId,
              username: e.username,
              statLine: `${e.gamesWon}/${e.gamesPlayed} wins${e.avgAttempts != null ? ` · avg ${e.avgAttempts.toFixed(1)}g` : ""}`,
              columns: [
                `${e.gamesWon}/${e.gamesPlayed}`,
                e.avgAttempts != null ? e.avgAttempts.toFixed(1) : "—",
                formatDuration(e.avgTimeMs),
              ],
            })),
          };
        } else {
          const res = await getGlobalDailyLeaderboard();
          normalized = {
            subtitle: formatDateLabel(res.date),
            columnHeaders: ["Result", "Guesses", "Time"],
            entries: res.leaderboard.map((e) => ({
              userId: e.userId,
              username: e.username,
              statLine: `${e.status === "won" ? "Won" : "Lost"} · ${e.attemptsUsed} guesses · ${formatDuration(e.timeTakenMs)}`,
              columns: [e.status === "won" ? "Won" : "Lost", String(e.attemptsUsed), formatDuration(e.timeTakenMs)],
            })),
          };
        }

        if (!cancelled) setData(normalized);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [groupId, period]);

  const currentGroup = groupId ? groups?.find((g) => g._id === groupId) : undefined;
  const title = groupId ? (currentGroup?.name ?? "Group") : "Global";

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-4">
        <ScreenHeader title="Leaderboard" onBack={onBack} />
        <p className="animate-fade-in text-sm text-danger">{error}</p>
      </div>
    );
  }

  const podium = data && data.entries.length >= 3 ? data.entries.slice(0, 3) : [];
  const top = data?.entries[0];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-4 md:gap-10 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <ScreenHeader title="Leaderboard" onBack={onBack} />
          <span className="pl-12 text-xs font-semibold uppercase tracking-widest text-foreground/50">
            {groupId ? title : "🌍 Worldwide"} {data ? `· ${data.subtitle}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-12 md:pl-0">
          <PeriodToggle
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(p) => setPeriod(p)}
          />
          <ScopeSwitcher
            currentLabel={groupId ? title : "Global"}
            groups={groups}
            onSelectGlobal={() => onSwitchScope(undefined)}
            onSelectGroup={(id) => onSwitchScope(id)}
          />
        </div>
      </div>

      {!data ? (
        <Loader label="Loading leaderboard…" />
      ) : data.entries.length === 0 ? (
        <p className="animate-fade-in text-sm text-foreground/55">
          {groupId ? "No games played in this group yet." : "Nobody has finished a game in this window yet."}
        </p>
      ) : (
        <>
          {/* desktop: podium + full table */}
          {podium.length === 3 && (
            <div className="hidden md:grid md:grid-cols-3 md:gap-5">
              <PodiumCard entry={podium[1]} rank={2} isMe={podium[1].userId === user?.id} delayMs={80} />
              <PodiumCard entry={podium[0]} rank={1} isMe={podium[0].userId === user?.id} delayMs={0} />
              <PodiumCard entry={podium[2]} rank={3} isMe={podium[2].userId === user?.id} delayMs={160} />
            </div>
          )}

          <div
            className="hidden animate-fade-in-up overflow-hidden rounded-3xl border border-border bg-surface md:block"
            style={{ animationDelay: "80ms" }}
          >
            <div className="grid grid-cols-[56px_minmax(0,1fr)_100px_100px_110px] gap-4 border-b border-border px-7 py-4 text-xs font-semibold uppercase tracking-wider text-foreground/50">
              <span>#</span>
              <span>Player</span>
              {data.columnHeaders.map((h) => (
                <span key={h} className="text-right">
                  {h}
                </span>
              ))}
            </div>
            {data.entries.map((entry, i) => {
              const isMe = entry.userId === user?.id;
              return (
                <div
                  key={entry.userId}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`grid animate-fade-in-up grid-cols-[56px_minmax(0,1fr)_100px_100px_110px] items-center gap-4 border-b border-border px-7 py-4 text-[15px] transition-colors duration-150 last:border-b-0 ${
                    isMe ? "bg-accent/8" : ""
                  }`}
                >
                  <span className={isMe ? "font-semibold text-accent" : "text-foreground/50"}>{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                        isMe ? "bg-accent/20 text-accent" : "bg-white/10"
                      }`}
                    >
                      {initial(entry.username)}
                    </span>
                    <span className={`truncate font-semibold ${isMe ? "text-accent" : ""}`}>
                      {entry.username}
                      {isMe && <span className="font-normal opacity-70"> · you</span>}
                    </span>
                  </span>
                  {entry.columns.map((c, ci) => (
                    <span key={ci} className={`text-right ${isMe ? "text-foreground" : "text-foreground/65"}`}>
                      {c}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>

          {/* mobile: hero card for #1 + flat list from #2 */}
          {top && (
            <div className="animate-fade-in-up md:hidden">
              <div className="flex items-center gap-3.5 rounded-[22px] border border-accent/35 bg-accent/10 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-lg font-bold text-background">
                  {initial(top.username)}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-lg font-bold tracking-tight">
                    {top.username}
                    {top.userId === user?.id && <span className="font-normal opacity-70"> · you</span>}
                  </span>
                  <span className="text-xs text-foreground/85">1st · {top.statLine}</span>
                </span>
                <span className="ml-auto text-xs font-semibold uppercase tracking-widest text-accent">Top</span>
              </div>
            </div>
          )}

          <div className="flex flex-col md:hidden">
            {data.entries.slice(1).map((entry, i) => {
              const rank = i + 2;
              const isMe = entry.userId === user?.id;
              return (
                <div
                  key={entry.userId}
                  className={`flex animate-fade-in-up items-center gap-3.5 border-b border-border py-3.5 last:border-b-0 ${
                    isMe ? "-mx-2.5 rounded-2xl border-b-0 bg-accent/8 px-2.5" : ""
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <span className={`w-5 text-xs ${isMe ? "font-semibold text-accent" : "text-foreground/50"}`}>
                    {rank}
                  </span>
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                      isMe ? "bg-accent/20 text-accent" : "bg-white/10"
                    }`}
                  >
                    {initial(entry.username)}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={`truncate text-[15px] font-semibold ${isMe ? "text-accent" : ""}`}>
                      {entry.username}
                      {isMe && <span className="font-normal opacity-70"> · you</span>}
                    </span>
                    <span className={`text-xs ${isMe ? "text-accent/80" : "text-foreground/50"}`}>
                      {entry.statLine}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {groupId && currentGroup && (
        <div className="flex items-center justify-between border-t border-border pt-5 text-xs text-foreground/50">
          <span>
            Invite code: <span className="select-text font-mono">{currentGroup.inviteCode}</span>
          </span>
          <span className="md:hidden">
            {currentGroup.members.length} member{currentGroup.members.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
