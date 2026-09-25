import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import AuthLayout from "@/components/AuthLayout";

// Single-use, per-person links — kept out of search results (it's also left
// out of the sitemap), and the referrer policy stops the token in the URL
// leaking to any third-party request the page makes.
export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <AuthLayout title="Almost there" subtitle="Choose a fresh password to get back to your streak.">
      <h1 className="text-2xl font-bold">Reset password</h1>
      <div className="mt-6">
        <ResetPasswordForm token={token} />
      </div>
    </AuthLayout>
  );
}
