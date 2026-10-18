import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Бизнесээ нээх", robots: { index: false } };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-16 items-center justify-between border-b border-line px-4 md:px-8">
        <Logo />
        <Link href="/" className="text-sm text-stone hover:text-ink">
          Нийтийн сайт руу буцах
        </Link>
      </header>
      <main id="main" className="px-4 py-8 md:px-8 md:py-12">
        {children}
      </main>
    </div>
  );
}
