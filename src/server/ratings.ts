import "server-only";
import { db } from "@/lib/db";

export async function recomputeRatings(businessId: string, staffId?: string | null) {
  const biz = await db.review.aggregate({ where: { businessId, status: "VISIBLE" }, _avg: { rating: true }, _count: { _all: true } });
  await db.business.update({
    where: { id: businessId },
    data: { ratingAvg: Math.round((biz._avg.rating ?? 0) * 10) / 10, reviewCount: biz._count._all },
  });
  if (staffId) {
    const s = await db.review.aggregate({ where: { staffId, status: "VISIBLE" }, _avg: { rating: true }, _count: { _all: true } });
    await db.businessStaff.update({
      where: { id: staffId },
      data: { ratingAvg: Math.round((s._avg.rating ?? 0) * 10) / 10, reviewCount: s._count._all },
    });
  }
}
