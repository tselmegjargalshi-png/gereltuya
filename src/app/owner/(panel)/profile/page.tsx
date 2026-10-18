import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { storageEnabled } from "@/lib/storage";
import { PageHeader } from "@/components/owner/page-header";
import { ProfileEditor } from "@/components/owner/profile-editor";

export const metadata: Metadata = { title: "Профайл" };

export default async function OwnerProfile() {
  const { business } = await requireOwnerBusiness();
  const [categories, gallery, services] = await Promise.all([
    db.serviceCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.businessGallery.findMany({ where: { businessId: business.id }, orderBy: { sortOrder: "asc" }, select: { id: true, imageUrl: true } }),
    db.service.findMany({ where: { businessId: business.id, active: true }, orderBy: { sortOrder: "asc" }, take: 4, select: { id: true, name: true, price: true, durationMin: true } }),
  ]);
  const selected = await db.business.findUnique({ where: { id: business.id }, select: { categories: { select: { id: true } } } });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Профайл" description="Үйлчлүүлэгчдэд харагдах бизнесийн мэдээлэл." />
      <ProfileEditor
        slug={business.slug}
        canUpload={storageEnabled()}
        categories={categories}
        gallery={gallery}
        services={services}
        initial={{
          name: business.name,
          tagline: business.tagline ?? "",
          description: business.description,
          address: business.address,
          district: business.district,
          phone: business.phone,
          email: business.email ?? "",
          instagram: business.instagram ?? "",
          facebook: business.facebook ?? "",
          website: business.website ?? "",
          logoUrl: business.logoUrl ?? "",
          coverUrl: business.coverUrl ?? "",
          categoryIds: selected?.categories.map((c) => c.id) ?? [],
        }}
      />
    </div>
  );
}
