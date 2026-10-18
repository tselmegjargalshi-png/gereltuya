import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/shared/auth-shell";
import { RegisterOwnerForm } from "@/components/shared/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";
import { IMG } from "@/lib/images";

export const metadata: Metadata = { title: "Бизнесээ бүртгүүлэх", robots: { index: false } };

export default async function RegisterBusinessPage() {
  const user = await getCurrentUser();
  if (user?.role === "BUSINESS_OWNER") redirect("/owner");
  return (
    <AuthShell
      title="Бизнесээ бүртгүүлээрэй"
      subtitle="7 алхамт хурдан бүртгэл. Эхлээд эзэмшигчийн бүртгэлээ үүсгэнэ."
      image={IMG.interiors[8]}
      footer={
        <>
          Бүртгэлтэй юу?{" "}
          <Link href="/login" className="font-medium text-ink underline underline-offset-4">
            Нэвтрэх
          </Link>
        </>
      }
    >
      <RegisterOwnerForm />
    </AuthShell>
  );
}
