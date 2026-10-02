"use client";

import { useCoinBalance } from "@/lib/coins";
import { useScreen } from "@/lib/screen-context";

/** The gold coin glyph — also used beside coin amounts elsewhere. */
export function CoinIcon({ className = "size-4" }: { className?: string }) {
  return <span className={`flex-none rounded-full border-2 border-[#c28c3e] bg-[#e3b75a] ${className}`} />;
}

/** Coin balance pill for headers (hub, play, Nav). Renders nothing until
 * the balance has loaded. Opens the Coins screen (inert on it). */
export default function CoinChip() {
  const balance = useCoinBalance();
  const { screen, push } = useScreen();
  if (balance === null) return null;
  const onClick = screen.name === "coins" ? undefined : () => push({ name: "coins" });

  const className =
    "flex animate-fade-in items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#e3b75a]/12 py-1.5 pl-[7px] pr-[11px] text-[13px] font-semibold text-[#e3b75a]";
  const content = (
    <>
      <CoinIcon />
      {balance.toLocaleString("en-IN")}
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      title="Your coins"
      aria-label={`${balance.toLocaleString("en-IN")} coins`}
      className={`${className} transition-colors hover:bg-[#e3b75a]/20`}
    >
      {content}
    </button>
  ) : (
    <span title="Your coins" aria-label={`${balance.toLocaleString("en-IN")} coins`} className={className}>
      {content}
    </span>
  );
}
