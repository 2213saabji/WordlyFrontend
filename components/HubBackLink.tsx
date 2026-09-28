/** Desktop "← Infinite hub" link for the Infinite sub-screens (play, How
 * tiers work, Tier history). Mobile uses ScreenHeader's back arrow, wired
 * to the same action. */
export default function HubBackLink({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 self-start text-[13.5px] font-semibold text-foreground/60 transition-colors hover:text-accent ${className}`}
    >
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
        aria-hidden
      >
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </svg>
      Infinite hub
    </button>
  );
}
