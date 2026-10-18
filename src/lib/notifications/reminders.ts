import "server-only";
import { db } from "@/lib/db";
import { formatTime, formatRelativeDay } from "@/lib/format";
import { notify } from "./index";

/**
 * Creates reminder notifications for upcoming appointments. Idempotent thanks to dedupe keys,
 * so it can run from a cron job and also lazily when a customer opens the app.
 */
export async function generateReminders(options: { userId?: string; now?: Date } = {}) {
  const now = options.now ?? new Date();
  const in24h = new Date(now.getTime() + 24 * 3600_000);
  const upcoming = await db.appointment.findMany({
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
      startAt: { gt: now, lte: in24h },
      userId: options.userId ? options.userId : { not: null },
    },
    include: { business: { select: { name: true } }, service: { select: { name: true } } },
    take: 500,
  });

  let created = 0;
  for (const a of upcoming) {
    if (!a.userId) continue;
    const minutesLeft = (a.startAt.getTime() - now.getTime()) / 60_000;
    const day = formatRelativeDay(a.startAt, now).toLowerCase();
    if (minutesLeft <= 60) {
      await notify({
        userId: a.userId,
        type: "REMINDER_1H",
        title: "Захиалгын сануулга",
        body: `Таны захиалга 1 цагийн дараа эхэлнэ. ${a.business.name}, ${a.service.name}.`,
        link: `/app/bookings/${a.id}`,
        channels: ["SMS", "PUSH"],
        dedupeKey: `reminder1h:${a.id}`,
      });
      created++;
    } else {
      await notify({
        userId: a.userId,
        type: "REMINDER_24H",
        title: "Захиалгын сануулга",
        body: `Таны захиалга ${day} ${formatTime(a.startAt)} цагт байна. ${a.business.name}, ${a.service.name}.`,
        link: `/app/bookings/${a.id}`,
        channels: ["SMS"],
        dedupeKey: `reminder24h:${a.id}`,
      });
      created++;
    }
  }
  return created;
}
