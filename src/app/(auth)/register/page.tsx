import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/shared/auth-shell";
import { RegisterCustomerForm } from "@/components/shared/auth-forms";
import { IMG } from "@/lib/images";

export const metadata: Metadata = { title: "Бүртгүүлэх", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell
      title="Бүртгүүлэх"
      subtitle="Цаг захиалж, хадгалсан салонууд болон түүхээ нэг дороос удирдана."
      image={IMG.interiors[4]}
      footer={
        <>
          Бүртгэлтэй юу?{" "}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
            Нэвтрэх
          </Link>
        </>
      }
    >
      <RegisterCustomerForm next={next} />
    </AuthShell>
  );
}
