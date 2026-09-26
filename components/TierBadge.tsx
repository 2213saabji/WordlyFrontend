import { TIER_COLORS } from "@/lib/tiers";
import type { TierNumber } from "@/types";

const SIZE = {
  sm: "size-[22px] rounded-[7px] text-xs",
  md: "size-[30px] rounded-[9px] text-sm",
  lg: "size-12 rounded-[15px] text-xl",
};

/** The tier number on its tier colour — used in headers, cards, chips and
 * leaderboard rows. `round` gives the circular variant (Nav chip). */
export default function TierBadge({
  tier,
  size = "sm",
  round = false,
}: {
  tier: TierNumber;
  size?: keyof typeof SIZE;
  round?: boolean;
}) {
  return (
    <span
      style={{ backgroundColor: TIER_COLORS[tier] }}
      className={`flex flex-none items-center justify-center font-display font-bold text-background ${SIZE[size]} ${
        round ? "rounded-full!" : ""
      }`}
    >
      {tier}
    </span>
  );
}

/** Badge + tier name in a pill — the header/Nav tier chip. */
export function TierChip({ tier, name, round = false }: { tier: TierNumber; name: string; round?: boolean }) {
  return (
    <span
      className={`flex items-center gap-2 bg-white/6 py-1.5 pl-1.5 pr-3 text-[13px] font-semibold ${
        round ? "rounded-full py-1 pl-1" : "rounded-xl"
      }`}
    >
      <TierBadge tier={tier} round={round} />
      {name}
    </span>
  );
}
