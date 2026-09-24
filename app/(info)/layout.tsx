import InfoHeader from "@/components/InfoHeader";
import InfoFooter from "@/components/InfoFooter";

// The public info pages get their own header/footer, matching the
// "GuessWord Info Pages" design — separate from the game's Nav/Footer,
// since these links are between info pages, not game screens, and don't
// need auth state at all (see (game)/layout.tsx for the game's own shell).
export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
      <InfoHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <InfoFooter />
    </div>
  );
}
