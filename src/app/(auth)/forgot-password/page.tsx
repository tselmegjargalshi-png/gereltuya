import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/shared/auth-shell";
import { ForgotPasswordForm } from "@/components/shared/auth-forms";

export const metadata: Metadata = { title: "Нууц үг сэргээх", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Нууц үг сэргээх"
      subtitle="Бүртгэлтэй и-мэйл хаягаа оруулна уу. Бид сэргээх холбоос илгээнэ."
      footer={
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Нэвтрэх хуудас руу буцах
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
