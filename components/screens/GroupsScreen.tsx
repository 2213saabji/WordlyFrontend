"use client";

import { useEffect, useState, type FormEvent } from "react";
import Loader from "@/components/Loader";
import ScreenHeader from "@/components/ScreenHeader";
import {
  createGroup,
  getGroupWeeklyLeaderboard,
  getMyGroups,
  joinGroup,
  leaveGroup,
  ApiRequestError,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Group } from "@/types";

const AVATAR_PALETTE = ["bg-accent/18 text-accent", "bg-accent-2/18 text-accent-2", "bg-white/10 text-foreground"];

function groupInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-accent">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
      <rect x="9" y="9" width="12" height="12" rx="3" />
      <path d="M15 5H6a3 3 0 0 0-3 3v9" />
    </svg>
  );
}

function GroupCard({
  group,
  index,
  rank,
  canLeave,
  copied,
  onCopy,
  onOpenLeaderboard,
  onLeave,
}: {
  group: Group;
  index: number;
  rank: number | undefined;
  canLeave: boolean;
  copied: boolean;
  onCopy: () => void;
  onOpenLeaderboard: () => void;
  onLeave: () => void;
}) {
  const solo = group.members.length === 1;

  return (
    <div
      className={`flex animate-fade-in-up flex-col gap-4 rounded-3xl border p-5 transition-all duration-200 sm:flex-row sm:items-center md:p-6 ${
        solo
          ? "border-dashed border-white/15 bg-white/3"
          : "border-border bg-surface hover:-translate-y-0.5 hover:shadow-md"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <button
        type="button"
        onClick={solo ? undefined : onOpenLeaderboard}
        disabled={solo}
        className={`flex min-w-0 flex-1 items-center gap-4 text-left ${solo ? "cursor-default" : ""}`}
      >
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${AVATAR_PALETTE[index % AVATAR_PALETTE.length]}`}
        >
          {groupInitials(group.name)}
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-lg font-semibold tracking-tight">{group.name}</span>
          <span className="text-xs text-foreground/55">
            {group.members.length} member{group.members.length === 1 ? "" : "s"}
            {solo ? " · waiting for someone to join" : rank ? ` · you're ${ordinal(rank)} this week` : ""}
          </span>
        </span>
      </button>

      <div className="flex items-center gap-3 sm:ml-auto">
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 font-mono text-xs tracking-widest text-foreground/70 transition-colors duration-150 hover:text-foreground"
        >
          {group.inviteCode}
          <CopyIcon copied={copied} />
        </button>
        {solo ? (
          <button
            type="button"
            onClick={onCopy}
            className="whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:underline"
          >
            Invite →
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:underline"
          >
            Leaderboard →
          </button>
        )}
        {canLeave && (
          <button
            type="button"
            onClick={onLeave}
            className="whitespace-nowrap text-xs text-foreground/40 transition-colors hover:text-danger"
          >
            Leave
          </button>
        )}
      </div>
    </div>
  );
}

export default function GroupsScreen({
  onBack,
  onOpenLeaderboard,
}: {
  onBack: () => void;
  onOpenLeaderboard: (groupId: string) => void;
}) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [ranks, setRanks] = useState<Record<string, number | undefined>>({});
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getMyGroups({ page: 1, limit: 20 }).then(({ groups, pagination }) => {
      setGroups(groups);
      setPage(pagination.page);
      setTotalPages(pagination.totalPages);
      setTotal(pagination.total);
    });
  }, []);

  const canLoadMore = page < totalPages;

  async function handleLoadMore() {
    if (loadingMore || !canLoadMore) return;
    setLoadingMore(true);
    try {
      const { groups: nextGroups, pagination } = await getMyGroups({ page: page + 1, limit: 20 });
      setGroups((prev) => [...(prev ?? []), ...nextGroups]);
      setPage(pagination.page);
      setTotalPages(pagination.totalPages);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const multiMemberGroups = (groups ?? []).filter((g) => g.members.length > 1);
    if (multiMemberGroups.length === 0) return;

    let cancelled = false;
    Promise.all(
      multiMemberGroups.map((g) =>
        // Just looking up one person's rank here, not paging through a
        // list — weekly has no `me` field, so request the server's max
        // page size (100) to make finding them in one shot as reliable as
        // it was before pagination existed.
        getGroupWeeklyLeaderboard(g._id, { limit: 100 })
          .then((res) => [g._id, res.leaderboard.find((e) => e.userId === user?.id)?.rank] as const)
          .catch(() => [g._id, undefined] as const),
      ),
    ).then((pairs) => {
      if (!cancelled) setRanks(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [groups, user?.id]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { group } = await createGroup(groupName);
      setGroups((prev) => [group, ...(prev ?? [])]);
      setTotal((t) => t + 1);
      setGroupName("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const group = await joinGroup(joinCode);
      const alreadyJoined = (groups ?? []).some((g) => g._id === group._id);
      setGroups((prev) => [group, ...(prev ?? []).filter((g) => g._id !== group._id)]);
      if (!alreadyJoined) setTotal((t) => t + 1);
      setJoinCode("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave(id: string) {
    setError(null);
    try {
      await leaveGroup(id);
      setGroups((prev) => (prev ?? []).filter((g) => g._id !== id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong");
    }
  }

  async function handleCopy(code: string, groupId: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(groupId);
      setTimeout(() => setCopiedId((c) => (c === groupId ? null : c)), 1500);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — nothing to fall back to.
    }
  }

  // Purely client-side — filters the groups already fetched via getMyGroups
  // above, no separate search endpoint.
  const filteredGroups = (groups ?? []).filter((g) =>
    g.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-4 md:gap-10 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <ScreenHeader title="Groups" onBack={onBack} />
          <p className="hidden max-w-md pl-12 text-sm leading-relaxed text-foreground/60 md:block">
            Everyone in a group plays the same daily word. Share the invite code to add people.
          </p>
        </div>
        <span className="pl-12 text-xs text-foreground/50 md:pl-0">
          {groups ? `${total} joined` : ""}
        </span>
      </div>

      {error && <p className="animate-fade-in text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-8 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-12">
        <div className="flex flex-col gap-3">
          {groups && groups.length > 0 && (
            <div className="relative mb-2">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search groups"
                className="w-full rounded-xl border border-white/15 bg-background/55 py-3 pl-10.5 pr-4 text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </div>
          )}

          {groups === null ? (
            <Loader label="Loading groups…" />
          ) : groups.length === 0 ? (
            <p className="animate-fade-in text-sm text-foreground/60">You&apos;re not in any groups yet.</p>
          ) : filteredGroups.length === 0 ? (
            <p className="animate-fade-in text-sm text-foreground/60">
              No groups match &ldquo;{search.trim()}&rdquo;
              {canLoadMore ? " among those loaded so far — try loading more below." : "."}
            </p>
          ) : (
            filteredGroups.map((group, i) => (
              <GroupCard
                key={group._id}
                group={group}
                index={i}
                rank={ranks[group._id]}
                canLeave={group.owner !== user?.id}
                copied={copiedId === group._id}
                onCopy={() => handleCopy(group.inviteCode, group._id)}
                onOpenLeaderboard={() => onOpenLeaderboard(group._id)}
                onLeave={() => handleLeave(group._id)}
              />
            ))
          )}

          {groups && groups.length > 0 && canLoadMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-1 self-center rounded-xl border border-white/12 bg-white/7 px-5 py-2.5 text-sm font-semibold transition-colors duration-150 hover:bg-white/12 disabled:pointer-events-none disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-3 rounded-3xl border border-accent/28 bg-accent/8 p-6"
          >
            <label className="text-[15px] font-semibold">Create a group</label>
            <input
              type="text"
              required
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="rounded-xl border border-white/15 bg-background/55 px-4 py-3 text-sm outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-accent py-3 text-sm font-bold text-background shadow-lg shadow-accent/25 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              Create
            </button>
          </form>

          <form
            onSubmit={handleJoin}
            className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6"
          >
            <label className="text-[15px] font-semibold">Join a group</label>
            <input
              type="text"
              required
              placeholder="Invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="rounded-xl border border-white/15 bg-background/55 px-4 py-3 font-mono text-sm uppercase tracking-widest outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl border border-white/12 bg-white/7 py-3 text-sm font-semibold transition-all duration-150 hover:bg-white/10 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-5 text-xs text-foreground/45">
        <span>GuessWord</span>
        <span>Weekly rank resets every Monday</span>
      </div>
    </div>
  );
}
