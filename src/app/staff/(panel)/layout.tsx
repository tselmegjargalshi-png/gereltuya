import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { Logo } from "@/components/brand/logo";
import { AccountMenu } from "@/components/shared/account-menu";
import { StaffNav } from "@/components/staff/staff-nav";

export const metadata: Metadata = { title: { default: "Миний хуваарь", template: "%s | GERELTUYA" }, robots: { index: false } };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, staff } = await requireStaff();
  return (
    <div className="min-h-dvh bg-paper pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-4">
            <Logo href="/staff" compact />
            <span className="hidden text-[13px] text-stone sm:block">{staff.business.name}</span>
          </div>
          <div className="hidden md:block">
            <StaffNav />
          </div>
          <AccountMenu name={user.name} avatarUrl={user.avatarUrl} homeHref="/staff/profile" homeLabel="Профайл" />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        {children}
      </main>
      <div className="md:hidden">
        <StaffNav />
      </div>
    </div>
  );
}
