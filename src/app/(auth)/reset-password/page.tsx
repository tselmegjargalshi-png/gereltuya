import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/shared/auth-shell";
import { ResetPasswordForm } from "@/components/shared/auth-forms";

export const metadata: Metadata = { title: "Шинэ нууц үг", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Шинэ нууц үг тохируулах" subtitle="Шинэ нууц үгээ оруулна уу.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">
          Холбоос буруу байна. <Link href="/forgot-password" className="underline">Дахин хүсэлт илгээнэ үү.</Link>
        </p>
      )}
    </AuthShell>
  );
}
