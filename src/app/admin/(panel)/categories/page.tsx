import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/owner/page-header";
import { CategoryManager } from "@/components/admin/admin-controls";

export const metadata: Metadata = { title: "Ангилал" };

export default async function AdminCategories() {
  const cats = await db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { services: true, businesses: true } } } });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Ангилал" description="Нүүр хуудас болон хайлтад харагдах үйлчилгээний ангиллууд." />
      <CategoryManager categories={cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl, sortOrder: c.sortOrder, active: c.active, services: c._count.services, businesses: c._count.businesses }))} />
    </div>
  );
}
