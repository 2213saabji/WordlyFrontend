import type { Metadata } from "next";
import AuthLayout from "@/components/AuthLayout";
import VerifySignupLink from "@/components/VerifySignupLink";

// Target of the signup email's link (${FRONTEND_URL}/verify-signup/<token>,
// 15 min, single use). Kept out of search results and the sitemap, and
// no-referrer stops the token leaking to third-party requests.
export const metadata: Metadata = {
  title: "Verify Email",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default async function VerifySignupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <AuthLayout title="Almost there" subtitle="Confirming your email to finish signing up.">
      <h1 className="text-2xl font-bold">Verify email</h1>
      <div className="mt-6">
        <VerifySignupLink token={token} />
      </div>
    </AuthLayout>
  );
}
