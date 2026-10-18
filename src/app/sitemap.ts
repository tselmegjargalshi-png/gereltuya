import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [businesses, services, staff, categories] = await Promise.all([
    db.business.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    db.service.findMany({ where: { active: true, business: { status: "ACTIVE" } }, select: { id: true, updatedAt: true, business: { select: { slug: true } } } }),
    db.businessStaff.findMany({ where: { active: true, business: { status: "ACTIVE" } }, select: { id: true } }),
    db.serviceCategory.findMany({ where: { active: true }, select: { slug: true } }),
  ]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/search`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({ url: `${base}/search?category=${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...businesses.map((b) => ({ url: `${base}/b/${b.slug}`, lastModified: b.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...services.map((s) => ({ url: `${base}/b/${s.business.slug}/service/${s.id}`, lastModified: s.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...staff.map((s) => ({ url: `${base}/s/${s.id}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
