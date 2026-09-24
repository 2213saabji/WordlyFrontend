import { AuthProvider } from "@/lib/auth-context";
import { ScreenProvider } from "@/lib/screen-context";
import Nav from "@/components/Nav";
import InfoFooter from "@/components/InfoFooter";

// The game itself (this route group) and the public info pages
// ((info) route group) are two different "apps" sharing one root layout —
// this one keeps the game's own Nav (Play/Groups/Leaderboard/History,
// gated by auth state), but now shares the same footer as the info pages.
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ScreenProvider>
        <Nav />
        <main className="flex min-h-screen flex-1 flex-col">{children}</main>
        <InfoFooter />
      </ScreenProvider>
    </AuthProvider>
  );
}
