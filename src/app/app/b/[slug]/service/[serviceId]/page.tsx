import { redirect } from "next/navigation";

export default async function AppService({ params }: { params: Promise<{ slug: string; serviceId: string }> }) {
  const { slug, serviceId } = await params;
  redirect(`/app/book/${slug}?service=${serviceId}`);
}
