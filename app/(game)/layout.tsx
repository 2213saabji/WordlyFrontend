import { AuthProvider } from "@/lib/auth-context";
import { ScreenProvider } from "@/lib/screen-context";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

// The game itself (this route group) and the public info pages
// ((info) route group) are two different "apps" sharing one root layout —
// this one keeps the game's own Nav (Play/Groups/Leaderboard/History,
// gated by auth state) and its footer, separate from the info pages'
// dedicated marketing header/footer.
export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ScreenProvider>
        <Nav />
        <main className="flex flex-1 flex-col">{children}</main>
        <Footer />
      </ScreenProvider>
    </AuthProvider>
  );
}
