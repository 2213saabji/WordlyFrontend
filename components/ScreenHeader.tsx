import type { ReactNode } from "react";

export default function ScreenHeader({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack: () => void;
  /** Optional right-aligned slot (e.g. the Infinite hub's tier chip). */
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-2 flex animate-fade-in-up items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground/70 transition-all duration-150 hover:-translate-x-0.5 hover:border-accent/40 hover:text-foreground active:scale-90"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
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
      </button>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}
