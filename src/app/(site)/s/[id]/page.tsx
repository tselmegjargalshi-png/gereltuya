import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getSpecialistProfile } from "@/server/discovery";
import { SpecialistProfileView } from "@/components/public/specialist-profile";

const load = cache(getSpecialistProfile);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await load(id);
  if (!data) return { title: "Мэргэжилтэн олдсонгүй" };
  const { staff } = data;
  return {
    title: `${staff.name}, ${staff.title} | ${staff.business.name}`,
    description: `${staff.name} (${staff.title}), ${staff.experienceYears} жилийн туршлагатай. ${staff.business.name}. Онлайнаар цаг захиалаарай.`,
    alternates: { canonical: `/s/${staff.id}` },
    openGraph: { images: staff.photoUrl ? [staff.photoUrl] : undefined },
  };
}

export default async function SpecialistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, user] = await Promise.all([load(id), getCurrentUser()]);
  if (!data) notFound();
  const saved = user ? Boolean(await db.favorite.findFirst({ where: { userId: user.id, staffId: id } })) : false;
  return <SpecialistProfileView data={data} saved={saved} signedIn={Boolean(user)} />;
}
