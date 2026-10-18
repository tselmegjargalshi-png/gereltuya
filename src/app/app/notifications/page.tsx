import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { NotificationList } from "@/components/shared/notification-list";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Мэдэгдэл" };

export default async function CustomerNotifications() {
  const user = await requireUser();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="container-page max-w-2xl py-6 md:py-10">
      <Link href="/app/profile" className="text-sm text-stone hover:text-ink">Профайл</Link>
      <h1 className="mt-3 font-display text-[2.4rem] leading-tight md:text-[3rem]">Мэдэгдэл</h1>
      {items.length === 0 ? (
        <EmptyState className="mt-8" icon={<Bell className="h-8 w-8" aria-hidden />} title="Шинэ мэдэгдэл алга байна." description="Захиалгын сануулга, баталгаажуулалт энд харагдана." />
      ) : (
        <NotificationList items={items.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt.toISOString(), read: Boolean(n.readAt) }))} />
      )}
    </div>
  );
}
