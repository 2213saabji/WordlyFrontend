"use client";

import { useRouter } from "next/navigation";
import TierLeaderboard from "@/components/TierLeaderboard";
import { useAuth } from "@/lib/auth-context";
import { useScreen } from "@/lib/screen-context";

/** /leaderboard/infinite — the tier board for anyone, signed in or not.
 * Its call to action hands off to the single-page app on "/": the login
 * screen for visitors, the Infinite hub for signed-in players. */
export default function PublicTierBoard() {
  const router = useRouter();
  const { user } = useAuth();
  const { reset } = useScreen();

  return (
    <TierLeaderboard
      onBack={() => router.push("/")}
      publicView={{
        signedIn: !!user,
        onCta: () => {
          reset(user ? { name: "infinite-hub" } : { name: "login" });
          router.push("/");
        },
      }}
    />
  );
}
