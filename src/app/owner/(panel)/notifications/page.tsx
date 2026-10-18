import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { PageHeader } from "@/components/owner/page-header";
import { NotificationList } from "@/components/shared/notification-list";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Мэдэгдэл" };

export default async function OwnerNotifications() {
  const { user } = await requireOwnerBusiness();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Мэдэгдэл" />
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="h-8 w-8" aria-hidden />} title="Шинэ мэдэгдэл алга байна." description="Шинэ захиалга, цуцлалт, сэтгэгдэл энд харагдана." />
      ) : (
        <NotificationList items={items.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt.toISOString(), read: Boolean(n.readAt) }))} />
      )}
    </div>
  );
}
