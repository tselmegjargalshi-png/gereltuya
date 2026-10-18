import "server-only";
import { db } from "@/lib/db";
import { generateReminders } from "@/lib/notifications/reminders";

/**
 * Keeps statuses honest without manual work: a confirmed appointment whose end time passed
 * more than 2 hours ago is treated as completed (owners can still mark no-shows within that window).
 */
export async function runMaintenance(now = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 3600_000);
  const completed = await db.appointment.updateMany({
    where: { status: { in: ["CONFIRMED", "PENDING"] }, endAt: { lt: cutoff } },
    data: { status: "COMPLETED" },
  });
  const reminders = await generateReminders({ now });
  return { completed: completed.count, reminders };
}

export async function completePastForBusiness(businessId: string, now = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 3600_000);
  await db.appointment.updateMany({
    where: { businessId, status: { in: ["CONFIRMED", "PENDING"] }, endAt: { lt: cutoff } },
    data: { status: "COMPLETED" },
  });
}
