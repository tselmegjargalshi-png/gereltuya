import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { completePastForBusiness } from "@/lib/maintenance";
import { OwnerMobileNav, OwnerSidebar } from "@/components/owner/owner-nav";
import { AccountMenu } from "@/components/shared/account-menu";
import { effectivePlan } from "@/lib/plans";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: { default: "Бизнесийн самбар", template: "%s | GERELTUYA" }, robots: { index: false } };

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = await requireOwnerBusiness();
  if (!business.onboardingCompleted) redirect("/owner/onboarding");
  await completePastForBusiness(business.id);
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });
  const plan = effectivePlan(business.subscription);

  return (
    <div className="flex min-h-dvh bg-paper">
      <OwnerSidebar businessName={business.name} slug={business.slug} />
      <div className="min-w-0 flex-1 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur-md md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="truncate text-[15px] font-semibold tracking-wide lg:hidden">{business.name}</span>
            <Badge tone={plan === "FREE" ? "neutral" : "accent"} className="hidden sm:inline-flex">{plan}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/owner/notifications" aria-label={`Мэдэгдэл${unread ? `, ${unread} шинэ` : ""}`} className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-ivory">
              <Bell className="h-5 w-5" />
              {unread ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-paper">{unread}</span> : null}
            </Link>
            <AccountMenu name={user.name} avatarUrl={user.avatarUrl} homeHref="/owner/settings" homeLabel="Тохиргоо" />
          </div>
        </header>
        {business.status !== "ACTIVE" ? (
          <div role="status" className="border-b border-warning/20 bg-warning-soft px-4 py-3 text-[13px] text-warning md:px-8">
            {business.status === "PENDING"
              ? "Таны бизнес баталгаажуулалт хүлээж байна. Баталгаажсаны дараа хайлтад харагдаж, захиалга авч эхэлнэ."
              : "Таны бизнесийн хуудас түр хаагдсан байна. Тусламж авахын тулд бидэнтэй холбогдоно уу."}
          </div>
        ) : null}
        <main id="main" className="px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>
      <OwnerMobileNav slug={business.slug} />
    </div>
  );
}
