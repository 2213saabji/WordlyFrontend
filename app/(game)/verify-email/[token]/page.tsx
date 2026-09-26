import type { Metadata } from "next";
import AuthLayout from "@/components/AuthLayout";
import ConfirmEmailVerification from "@/components/ConfirmEmailVerification";

// Target of the payout-verification email (POST /verification/email/confirm).
// The backend emails https://www.guessword.games/verify-email/<token> (24h).
// Single-use, per-person links: kept out of search results and the sitemap,
// and no-referrer stops the token leaking to third-party requests.
export const metadata: Metadata = {
  title: "Confirm Email",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <AuthLayout title="Almost there" subtitle="Confirming the email for your Diamond reward.">
      <h1 className="text-2xl font-bold">Confirm email</h1>
      <div className="mt-6">
        <ConfirmEmailVerification token={token} />
      </div>
    </AuthLayout>
  );
}
