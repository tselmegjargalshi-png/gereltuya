import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableDays, getAvailableSlots } from "@/lib/availability";

const querySchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(45).optional(),
  ignore: z.string().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Хүсэлт буруу байна." }, { status: 400 });
  const { businessId, serviceId, staffId, date, days, ignore } = parsed.data;
  try {
    if (date) {
      const slots = await getAvailableSlots({ businessId, serviceId, staffId: staffId || null, dateKey: date, ignoreAppointmentId: ignore });
      return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
    }
    const available = await getAvailableDays({ businessId, serviceId, staffId: staffId || null, days: days ?? 21 });
    return NextResponse.json({ days: available }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Мэдээлэл ачааллахад алдаа гарлаа." }, { status: 500 });
  }
}
