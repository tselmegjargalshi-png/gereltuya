import { BookingPage } from "@/components/booking/booking-page";

export default async function AppBook({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  return <BookingPage slug={slug} raw={raw} base="/app" />;
}
