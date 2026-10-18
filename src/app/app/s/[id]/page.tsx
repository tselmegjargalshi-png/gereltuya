import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getSpecialistProfile } from "@/server/discovery";
import { SpecialistProfileView } from "@/components/public/specialist-profile";

export default async function AppSpecialist({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, user] = await Promise.all([getSpecialistProfile(id), requireUser()]);
  if (!data) notFound();
  const saved = Boolean(await db.favorite.findFirst({ where: { userId: user.id, staffId: id } }));
  return <SpecialistProfileView data={data} base="/app" saved={saved} signedIn />;
}
