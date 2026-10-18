import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { searchBusinesses, searchSpecialists } from "@/server/discovery";
import { BusinessCard } from "@/components/public/business-card";
import { SpecialistCard } from "@/components/public/specialist-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Хадгалсан" };

export default async function SavedPage() {
  const user = await requireUser();
  const favs = await db.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const businessIds = favs.map((f) => f.businessId).filter(Boolean) as string[];
  const staffIds = favs.map((f) => f.staffId).filter(Boolean) as string[];
  const [allBiz, allStaff] = await Promise.all([
    businessIds.length ? searchBusinesses({}) : Promise.resolve([]),
    staffIds.length ? searchSpecialists({}, { limit: 200 }) : Promise.resolve([]),
  ]);
  const businesses = allBiz.filter((b) => businessIds.includes(b.id));
  const specialists = allStaff.filter((s) => staffIds.includes(s.id));

  return (
    <div className="container-page max-w-5xl py-6 md:py-10">
      <h1 className="font-display text-[2.4rem] leading-tight md:text-[3rem]">Хадгалсан</h1>
      {businesses.length + specialists.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Heart className="h-8 w-8" aria-hidden />}
          title="Хадгалсан салон, мэргэжилтэн алга байна."
          description="Дуртай салон, мэргэжилтнийхээ зурган дээрх зүрхэн тэмдгийг дарж хадгална уу."
          action={<ButtonLink href="/app/search">Салон хайх</ButtonLink>}
        />
      ) : (
        <>
          {businesses.length ? (
            <section aria-labelledby="sb" className="mt-8">
              <h2 id="sb" className="mb-5 text-[15px] font-semibold">Салонууд</h2>
              <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {businesses.map((b) => (
                  <BusinessCard key={b.id} business={b} base="/app" saved signedIn />
                ))}
              </div>
            </section>
          ) : null}
          {specialists.length ? (
            <section aria-labelledby="ss" className="mt-12">
              <h2 id="ss" className="mb-5 text-[15px] font-semibold">Мэргэжилтнүүд</h2>
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                {specialists.map((s) => (
                  <SpecialistCard key={s.id} specialist={s} base="/app" />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
