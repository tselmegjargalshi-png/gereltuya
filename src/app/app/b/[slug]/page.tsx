import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { getBusinessProfile } from "@/server/discovery";
import { BusinessProfileView } from "@/components/public/business-profile";

export default async function AppBusiness({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, user] = await Promise.all([getBusinessProfile(slug), requireUser()]);
  if (!data) notFound();
  const saved = Boolean(await db.favorite.findFirst({ where: { userId: user.id, businessId: data.business.id } }));
  return <BusinessProfileView data={data} base="/app" saved={saved} signedIn />;
}
