"use client";

import { useRouter } from "next/navigation";
import TierLeaderboard from "@/components/TierLeaderboard";
import { useAuth } from "@/lib/auth-context";
import { useScreen } from "@/lib/screen-context";

/** /leaderboard/infinite — the tier board for anyone, signed in or not.
 * Its call to action hands off to the app: the login screen on "/" for
 * visitors, the Infinite hub on "/home" for signed-in players. */
export default function PublicTierBoard() {
  const router = useRouter();
  const { user } = useAuth();
  const { reset, push } = useScreen();

  return (
    <TierLeaderboard
      onBack={() => router.push(user ? "/home" : "/")}
      publicView={{
        signedIn: !!user,
        onCta: () => {
          if (user) {
            reset();
            push({ name: "infinite-hub" });
            router.push("/home");
          } else {
            reset({ name: "login", then: { name: "infinite-hub" } });
            router.push("/");
          }
        },
      }}
    />
  );
}
