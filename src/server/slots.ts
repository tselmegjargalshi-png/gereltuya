import "server-only";
import { getAvailableSlots } from "@/lib/availability";
import type { DaySlots } from "@/components/public/slot-chips";
import { addDays, toDateKey, ubStartOfDay } from "@/lib/time";

export async function getUpcomingSlots(params: { businessId: string; serviceId: string; staffId?: string; days?: number }): Promise<DaySlots[]> {
  const start = ubStartOfDay(new Date());
  const count = params.days ?? 3;
  const result = await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const date = addDays(start, i);
      const dateKey = toDateKey(date);
      const slots = await getAvailableSlots({ businessId: params.businessId, serviceId: params.serviceId, staffId: params.staffId, dateKey });
      return { dateKey, date, times: slots.map((s) => ({ time: s.time, startAt: s.startAt })) };
    }),
  );
  return result;
}
