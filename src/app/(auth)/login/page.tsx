import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/shared/auth-shell";
import { LoginForm } from "@/components/shared/auth-forms";
import { getCurrentUser, homeForRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Нэвтрэх", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const [{ next, reset }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : homeForRole(user.role));
  return (
    <AuthShell
      title="Тавтай морил"
      subtitle="Бүртгэлдээ нэвтэрч захиалгаа удирдана уу."
      footer={
        <>
          Шинэ хэрэглэгч үү?{" "}
          <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
            Бүртгүүлэх
          </Link>
          <span className="mx-2 text-sand">|</span>
          <Link href="/register/business" className="font-medium text-ink underline underline-offset-4">
            Бизнесээ бүртгүүлэх
          </Link>
        </>
      }
    >
      <LoginForm next={next} resetDone={reset === "1"} />
      <DemoLogins />
    </AuthShell>
  );
}

function DemoLogins() {
  const rows = [
    ["Үйлчлүүлэгч", "customer@gereltuya.mn"],
    ["Бизнес эзэмшигч", "owner@gereltuya.mn"],
    ["Мэргэжилтэн", "staff@gereltuya.mn"],
    ["Админ", "admin@gereltuya.mn"],
  ];
  return (
    <details className="mt-8 rounded-[12px] border border-dashed border-sand bg-ivory/50 p-4 text-sm">
      <summary className="cursor-pointer font-medium">Демо хэрэглэгчид</summary>
      <p className="mt-2 text-stone">Бүгдийн нууц үг: <code className="rounded bg-surface px-1.5 py-0.5">Demo1234</code></p>
      <ul className="mt-2 space-y-1">
        {rows.map(([role, email]) => (
          <li key={email} className="flex justify-between gap-3">
            <span className="text-stone">{role}</span>
            <code className="text-[12.5px]">{email}</code>
          </li>
        ))}
      </ul>
    </details>
  );
}
