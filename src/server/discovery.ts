import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getNextAvailability } from "@/lib/availability";
import { distanceKm, findDistrict } from "@/lib/districts";
import type { SortValue } from "@/lib/labels";
import { addDays, hhmmToMinutes, ubMinutesOfDay, ubParts, ubStartOfDay } from "@/lib/time";

export type BusinessCardData = {
  id: string;
  slug: string;
  name: string;
  coverUrl: string | null;
  categories: string[];
  district: string;
  ratingAvg: number;
  reviewCount: number;
  minPrice: number | null;
  nextAvailable: string | null;
  distanceKm: number | null;
  openNow: boolean;
  bookings: number;
};

export type SpecialistCardData = {
  id: string;
  name: string;
  title: string;
  photoUrl: string | null;
  ratingAvg: number;
  reviewCount: number;
  experienceYears: number;
  nextAvailable: string | null;
  businessName: string;
  businessSlug: string;
  businessId: string;
};

export type SearchParams = {
  q?: string;
  category?: string;
  district?: string;
  service?: string;
  minRating?: number;
  maxPrice?: number;
  availableToday?: boolean;
  openNow?: boolean;
  specialist?: boolean;
  sort?: SortValue;
  loc?: string;
};

export const getCategories = cache(async () => {
  const [categories, counts] = await Promise.all([
    db.serviceCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.service.groupBy({ by: ["categoryId"], where: { active: true, business: { status: "ACTIVE" } }, _count: { _all: true } }),
  ]);
  return categories.map((c) => ({
    ...c,
    serviceCount: counts.find((x) => x.categoryId === c.id)?._count._all ?? 0,
  }));
});

function isOpenNow(hours: { weekday: number; openTime: string; closeTime: string; isClosed: boolean }[], now: Date): boolean {
  const wd = ubParts(now).weekday;
  const h = hours.find((x) => x.weekday === wd);
  if (!h || h.isClosed) return false;
  const m = ubMinutesOfDay(now);
  return m >= hhmmToMinutes(h.openTime) && m < hhmmToMinutes(h.closeTime);
}

const businessCardSelect = {
  id: true,
  slug: true,
  name: true,
  coverUrl: true,
  district: true,
  ratingAvg: true,
  reviewCount: true,
  lat: true,
  lng: true,
  categories: { select: { name: true, slug: true }, orderBy: { sortOrder: "asc" } },
  services: { where: { active: true }, select: { price: true, name: true } },
  workingHours: { where: { staffId: null }, select: { weekday: true, openTime: true, closeTime: true, isClosed: true } },
} satisfies Prisma.BusinessSelect;

export async function searchBusinesses(params: SearchParams, options: { limit?: number } = {}): Promise<BusinessCardData[]> {
  const now = new Date();
  const q = params.q?.trim();
  const where: Prisma.BusinessWhereInput = { status: "ACTIVE", onboardingCompleted: true };
  const and: Prisma.BusinessWhereInput[] = [];

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { district: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { categories: { some: { name: { contains: q, mode: "insensitive" } } } },
        { services: { some: { active: true, name: { contains: q, mode: "insensitive" } } } },
        { staff: { some: { active: true, name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }
  if (params.category) and.push({ categories: { some: { slug: params.category } } });
  if (params.district) and.push({ district: params.district });
  if (params.service) and.push({ services: { some: { active: true, name: { contains: params.service, mode: "insensitive" } } } });
  if (params.minRating) and.push({ ratingAvg: { gte: params.minRating } });
  if (params.maxPrice) and.push({ services: { some: { active: true, price: { lte: params.maxPrice } } } });
  if (and.length) where.AND = and;

  const rows = await db.business.findMany({ where, select: businessCardSelect, take: 120 });
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const [next, bookingCounts] = await Promise.all([
    getNextAvailability({ businessIds: ids }, { now }),
    db.appointment.groupBy({
      by: ["businessId"],
      where: { businessId: { in: ids }, status: { in: ["COMPLETED", "CONFIRMED"] }, startAt: { gte: addDays(now, -90) } },
      _count: { _all: true },
    }),
  ]);

  const origin = findDistrict(params.loc ?? params.district);
  let cards: BusinessCardData[] = rows.map((r) => {
    const prices = r.services.map((s) => s.price);
    const nextAt = next.get(r.id) ?? null;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      coverUrl: r.coverUrl,
      categories: r.categories.map((c) => c.name),
      district: r.district,
      ratingAvg: r.ratingAvg,
      reviewCount: r.reviewCount,
      minPrice: prices.length ? Math.min(...prices) : null,
      nextAvailable: nextAt ? nextAt.toISOString() : null,
      distanceKm: origin && r.lat != null && r.lng != null ? distanceKm(origin, { lat: r.lat, lng: r.lng }) : null,
      openNow: isOpenNow(r.workingHours, now),
      bookings: bookingCounts.find((b) => b.businessId === r.id)?._count._all ?? 0,
    };
  });

  if (params.availableToday) {
    const todayEnd = addDays(ubStartOfDay(now), 1).getTime();
    cards = cards.filter((c) => c.nextAvailable && new Date(c.nextAvailable).getTime() < todayEnd);
  }
  if (params.openNow) cards = cards.filter((c) => c.openNow);

  const sort = params.sort ?? "popular";
  cards.sort((a, b) => {
    switch (sort) {
      case "nearest":
        return (a.distanceKm ?? 999) - (b.distanceKm ?? 999) || b.ratingAvg - a.ratingAvg;
      case "rating":
        return b.ratingAvg - a.ratingAvg || b.reviewCount - a.reviewCount;
      case "price_asc":
        return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
      case "price_desc":
        return (b.minPrice ?? 0) - (a.minPrice ?? 0);
      default:
        return b.bookings - a.bookings;
    }
  });

  return options.limit ? cards.slice(0, options.limit) : cards;
}

export async function searchSpecialists(params: SearchParams, options: { limit?: number } = {}): Promise<SpecialistCardData[]> {
  const q = params.q?.trim();
  const where: Prisma.BusinessStaffWhereInput = {
    active: true,
    business: { status: "ACTIVE", onboardingCompleted: true, ...(params.district ? { district: params.district } : {}) },
  };
  const and: Prisma.BusinessStaffWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { services: { some: { active: true, name: { contains: q, mode: "insensitive" } } } },
        { business: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (params.category) and.push({ services: { some: { active: true, category: { slug: params.category } } } });
  if (params.minRating) and.push({ ratingAvg: { gte: params.minRating } });
  if (and.length) where.AND = and;

  const rows = await db.businessStaff.findMany({
    where,
    include: { business: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
    take: options.limit ?? 40,
  });
  const next = await getNextAvailability({ staffIds: rows.map((r) => r.id) });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    title: r.title,
    photoUrl: r.photoUrl,
    ratingAvg: r.ratingAvg,
    reviewCount: r.reviewCount,
    experienceYears: r.experienceYears,
    nextAvailable: next.get(r.id)?.toISOString() ?? null,
    businessName: r.business.name,
    businessSlug: r.business.slug,
    businessId: r.business.id,
  }));
}

export async function getPopularServices(limit = 8) {
  const grouped = await db.service.groupBy({
    by: ["name"],
    where: { active: true, business: { status: "ACTIVE" } },
    _count: { _all: true },
    _min: { price: true },
  });
  const counts = await db.appointment.groupBy({
    by: ["serviceId"],
    where: { status: { in: ["COMPLETED", "CONFIRMED"] }, startAt: { gte: addDays(new Date(), -60) } },
    _count: { _all: true },
  });
  const services = await db.service.findMany({
    where: { id: { in: counts.map((c) => c.serviceId) } },
    select: { id: true, name: true },
  });
  const byName = new Map<string, number>();
  for (const c of counts) {
    const name = services.find((s) => s.id === c.serviceId)?.name;
    if (name) byName.set(name, (byName.get(name) ?? 0) + c._count._all);
  }
  return grouped
    .map((g) => ({ name: g.name, businesses: g._count._all, minPrice: g._min.price ?? 0, bookings: byName.get(g.name) ?? 0 }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, limit);
}

export async function getBusinessProfile(slug: string) {
  const business = await db.business.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      categories: { orderBy: { sortOrder: "asc" } },
      gallery: { orderBy: { sortOrder: "asc" } },
      workingHours: { where: { staffId: null }, orderBy: { weekday: "asc" } },
      bookingRule: true,
      services: {
        where: { active: true },
        orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
        include: { category: true, staff: { where: { active: true }, select: { id: true, name: true, photoUrl: true } } },
      },
      staff: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!business) return null;
  const [reviews, next, ratingBuckets] = await Promise.all([
    db.review.findMany({
      where: { businessId: business.id, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { name: true, avatarUrl: true } }, appointment: { select: { service: { select: { name: true } } } }, staff: { select: { name: true } } },
    }),
    getNextAvailability({ businessIds: [business.id] }),
    db.review.groupBy({ by: ["rating"], where: { businessId: business.id, status: "VISIBLE" }, _count: { _all: true } }),
  ]);
  const staffNext = await getNextAvailability({ staffIds: business.staff.map((s) => s.id) });
  return { business, reviews, nextAvailable: next.get(business.id) ?? null, staffNext, ratingBuckets };
}

export async function getSpecialistProfile(id: string) {
  const staff = await db.businessStaff.findFirst({
    where: { id, active: true, business: { status: "ACTIVE" } },
    include: {
      business: { select: { id: true, slug: true, name: true, address: true, district: true, coverUrl: true, ratingAvg: true, reviewCount: true } },
      services: { where: { active: true }, include: { category: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!staff) return null;
  const [reviews, hours, bizHours, next] = await Promise.all([
    db.review.findMany({
      where: { staffId: staff.id, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } }, appointment: { select: { service: { select: { name: true } } } } },
    }),
    db.workingHour.findMany({ where: { staffId: staff.id } }),
    db.workingHour.findMany({ where: { businessId: staff.businessId, staffId: null }, orderBy: { weekday: "asc" } }),
    getNextAvailability({ staffIds: [staff.id] }),
  ]);
  return { staff, reviews, hours, bizHours, nextAvailable: next.get(staff.id) ?? null };
}

export async function getServiceDetail(businessSlug: string, serviceId: string) {
  const service = await db.service.findFirst({
    where: { id: serviceId, active: true, business: { slug: businessSlug, status: "ACTIVE" } },
    include: {
      category: true,
      business: { select: { id: true, slug: true, name: true, address: true, district: true, coverUrl: true, ratingAvg: true, reviewCount: true } },
      staff: { where: { active: true } },
    },
  });
  if (!service) return null;
  const next = await getNextAvailability({ staffIds: service.staff.map((s) => s.id) });
  return { service, staffNext: next };
}

export async function getHomeData(userDistrict?: string) {
  const [categories, featured, specialists, available, popularServices, stats, specialistCount] = await Promise.all([
    getCategories(),
    searchBusinesses({ sort: "rating", loc: userDistrict }, { limit: 6 }),
    searchSpecialists({}, { limit: 8 }),
    searchBusinesses({ availableToday: true, sort: "rating", loc: userDistrict }, { limit: 6 }),
    getPopularServices(8),
    db.business.count({ where: { status: "ACTIVE" } }),
    db.businessStaff.count({ where: { active: true, business: { status: "ACTIVE" } } }),
  ]);
  return { categories, featured, specialists, available, popularServices, businessCount: stats, specialistCount };
}

export async function getTodaySlotsForBusiness(businessIds: string[], limit = 3) {
  const next = await getNextAvailability({ businessIds });
  return [...next.entries()].slice(0, limit);
}
