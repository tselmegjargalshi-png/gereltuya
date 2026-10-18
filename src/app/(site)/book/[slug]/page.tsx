import type { Metadata } from "next";
import { BookingPage } from "@/components/booking/booking-page";

export const metadata: Metadata = { title: "Цаг захиалах", robots: { index: false } };

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  return <BookingPage slug={slug} raw={raw} />;
}
