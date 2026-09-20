import ResetPasswordForm from "@/components/ResetPasswordForm";
import AuthLayout from "@/components/AuthLayout";

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
