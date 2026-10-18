import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  addDays,
  addMinutes,
  fromDateKey,
  hhmmToMinutes,
  minutesToHhmm,
  toDateKey,
  ubParts,
  ubStartOfDay,
} from "@/lib/time";

export const BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"] as const;

export type DaySchedule = { open: number; close: number; breakStart?: number; breakEnd?: number } | null;

type HourRow = {
  staffId: string | null;
  weekday: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  breakStart: string | null;
  breakEnd: string | null;
};

type Interval = { start: number; end: number; staffId: string | null };

export type Slot = { time: string; startAt: string; staffIds: string[] };

const DEFAULT_RULE = { minLeadMinutes: 60, maxAdvanceDays: 30, slotStepMin: 30, bufferMin: 0 };

function toSchedule(row: HourRow | undefined): DaySchedule {
  if (!row || row.isClosed) return null;
  return {
    open: hhmmToMinutes(row.openTime),
    close: hhmmToMinutes(row.closeTime),
    breakStart: row.breakStart ? hhmmToMinutes(row.breakStart) : undefined,
    breakEnd: row.breakEnd ? hhmmToMinutes(row.breakEnd) : undefined,
  };
}

/** Staff hours win over business hours; business hours are the fallback. */
export function resolveSchedule(hours: HourRow[], staffId: string, weekday: number): DaySchedule {
  const own = hours.find((h) => h.staffId === staffId && h.weekday === weekday);
  if (own) return toSchedule(own);
  return toSchedule(hours.find((h) => h.staffId === null && h.weekday === weekday));
}

/** Pure slot computation for one staff member on one local day. Returns start minutes of day. */
export function computeStaffSlots(args: {
  dayStart: Date;
  schedule: DaySchedule;
  durationMin: number;
  stepMin: number;
  bufferMin: number;
  busy: { start: number; end: number }[];
  earliest: number;
  latest: number;
}): number[] {
  const { dayStart, schedule, durationMin, stepMin, bufferMin, busy, earliest, latest } = args;
  if (!schedule) return [];
  const result: number[] = [];
  const base = dayStart.getTime();
  for (let m = schedule.open; m + durationMin <= schedule.close; m += stepMin) {
    const start = base + m * 60_000;
    const end = start + durationMin * 60_000;
    if (start < earliest || start > latest) continue;
    if (
      schedule.breakStart !== undefined &&
      schedule.breakEnd !== undefined &&
      m < schedule.breakEnd &&
      m + durationMin > schedule.breakStart
    ) {
      continue;
    }
    const pad = bufferMin * 60_000;
    const clash = busy.some((b) => start < b.end + pad && end + pad > b.start);
    if (!clash) result.push(m);
  }
  return result;
}

async function loadContext(businessId: string, staffIds: string[], from: Date, to: Date) {
  const [hours, appointments, blocks, rule] = await Promise.all([
    db.workingHour.findMany({ where: { businessId } }),
    db.appointment.findMany({
      where: {
        businessId,
        staffId: { in: staffIds },
        status: { in: [...BLOCKING_STATUSES] },
        startAt: { lt: to },
        endAt: { gt: from },
      },
      select: { staffId: true, startAt: true, endAt: true, id: true },
    }),
    db.blockedTime.findMany({
      where: { businessId, startAt: { lt: to }, endAt: { gt: from } },
      select: { staffId: true, startAt: true, endAt: true },
    }),
    db.bookingRule.findUnique({ where: { businessId } }),
  ]);
  return { hours, appointments, blocks, rule: rule ?? DEFAULT_RULE };
}

function busyFor(
  staffId: string,
  appointments: { staffId: string; startAt: Date; endAt: Date; id: string }[],
  blocks: { staffId: string | null; startAt: Date; endAt: Date }[],
  ignoreAppointmentId?: string,
): Interval[] {
  return [
    ...appointments
      .filter((a) => a.staffId === staffId && a.id !== ignoreAppointmentId)
      .map((a) => ({ start: a.startAt.getTime(), end: a.endAt.getTime(), staffId })),
    ...blocks
      .filter((b) => b.staffId === null || b.staffId === staffId)
      .map((b) => ({ start: b.startAt.getTime(), end: b.endAt.getTime(), staffId: b.staffId })),
  ];
}

export async function getAvailableSlots(params: {
  businessId: string;
  serviceId: string;
  staffId?: string | null;
  dateKey: string;
  now?: Date;
  ignoreAppointmentId?: string;
  /** Owners can book inside the lead-time window and beyond the advance limit. */
  bypassRules?: boolean;
}): Promise<Slot[]> {
  const now = params.now ?? new Date();
  const dayStart = fromDateKey(params.dateKey);
  if (!dayStart) return [];

  const service = await db.service.findFirst({
    where: { id: params.serviceId, businessId: params.businessId, active: true },
    include: { staff: { where: { active: true }, select: { id: true } } },
  });
  if (!service) return [];

  let staffIds = service.staff.map((s) => s.id);
  if (params.staffId) staffIds = staffIds.filter((id) => id === params.staffId);
  if (staffIds.length === 0) return [];

  const dayEnd = addDays(dayStart, 1);
  const ctx = await loadContext(params.businessId, staffIds, dayStart, dayEnd);
  const weekday = ubParts(dayStart).weekday;
  const earliest = params.bypassRules ? 0 : now.getTime() + ctx.rule.minLeadMinutes * 60_000;
  const latest = params.bypassRules
    ? Number.MAX_SAFE_INTEGER
    : addDays(ubStartOfDay(now), ctx.rule.maxAdvanceDays + 1).getTime();

  const byMinute = new Map<number, string[]>();
  for (const staffId of staffIds) {
    const slots = computeStaffSlots({
      dayStart,
      schedule: resolveSchedule(ctx.hours, staffId, weekday),
      durationMin: service.durationMin,
      stepMin: ctx.rule.slotStepMin,
      bufferMin: ctx.rule.bufferMin,
      busy: busyFor(staffId, ctx.appointments, ctx.blocks, params.ignoreAppointmentId),
      earliest,
      latest,
    });
    for (const m of slots) byMinute.set(m, [...(byMinute.get(m) ?? []), staffId]);
  }

  return [...byMinute.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([m, ids]) => ({ time: minutesToHhmm(m), startAt: addMinutes(dayStart, m).toISOString(), staffIds: ids }));
}

/** Which of the next N days have at least one free slot (for the date picker). */
export async function getAvailableDays(params: {
  businessId: string;
  serviceId: string;
  staffId?: string | null;
  days?: number;
  now?: Date;
}): Promise<Record<string, number>> {
  const now = params.now ?? new Date();
  const rule = (await db.bookingRule.findUnique({ where: { businessId: params.businessId } })) ?? DEFAULT_RULE;
  const total = Math.min(params.days ?? 14, rule.maxAdvanceDays + 1);
  const start = ubStartOfDay(now);
  const out: Record<string, number> = {};
  const service = await db.service.findFirst({
    where: { id: params.serviceId, businessId: params.businessId, active: true },
    include: { staff: { where: { active: true }, select: { id: true } } },
  });
  if (!service) return out;
  let staffIds = service.staff.map((s) => s.id);
  if (params.staffId) staffIds = staffIds.filter((id) => id === params.staffId);
  const ctx = await loadContext(params.businessId, staffIds, start, addDays(start, total));
  const earliest = now.getTime() + ctx.rule.minLeadMinutes * 60_000;
  for (let i = 0; i < total; i++) {
    const day = addDays(start, i);
    const weekday = ubParts(day).weekday;
    const set = new Set<number>();
    for (const staffId of staffIds) {
      computeStaffSlots({
        dayStart: day,
        schedule: resolveSchedule(ctx.hours, staffId, weekday),
        durationMin: service.durationMin,
        stepMin: ctx.rule.slotStepMin,
        bufferMin: ctx.rule.bufferMin,
        busy: busyFor(staffId, ctx.appointments, ctx.blocks),
        earliest,
        latest: Number.MAX_SAFE_INTEGER,
      }).forEach((m) => set.add(m));
    }
    out[toDateKey(day)] = set.size;
  }
  return out;
}

/**
 * Next free slot per business (or per staff member) within a few days, computed in a
 * fixed number of queries. Used by discovery cards ("Өнөөдөр 15:30 боломжтой").
 */
export async function getNextAvailability(
  scope: { businessIds?: string[]; staffIds?: string[] },
  options: { days?: number; now?: Date } = {},
): Promise<Map<string, Date>> {
  const now = options.now ?? new Date();
  const days = options.days ?? 4;
  const start = ubStartOfDay(now);
  const end = addDays(start, days);

  const staffWhere: Prisma.BusinessStaffWhereInput = {
    active: true,
    services: { some: { active: true } },
    ...(scope.staffIds ? { id: { in: scope.staffIds } } : {}),
    ...(scope.businessIds ? { businessId: { in: scope.businessIds } } : {}),
  };
  const staff = await db.businessStaff.findMany({
    where: staffWhere,
    select: {
      id: true,
      businessId: true,
      services: { where: { active: true }, select: { durationMin: true }, orderBy: { durationMin: "asc" }, take: 1 },
    },
  });
  if (staff.length === 0) return new Map();
  const businessIds = [...new Set(staff.map((s) => s.businessId))];
  const staffIds = staff.map((s) => s.id);

  const [hours, appointments, blocks, rules] = await Promise.all([
    db.workingHour.findMany({ where: { businessId: { in: businessIds } } }),
    db.appointment.findMany({
      where: { staffId: { in: staffIds }, status: { in: [...BLOCKING_STATUSES] }, startAt: { lt: end }, endAt: { gt: start } },
      select: { id: true, staffId: true, startAt: true, endAt: true },
    }),
    db.blockedTime.findMany({
      where: { businessId: { in: businessIds }, startAt: { lt: end }, endAt: { gt: start } },
      select: { businessId: true, staffId: true, startAt: true, endAt: true },
    }),
    db.bookingRule.findMany({ where: { businessId: { in: businessIds } } }),
  ]);

  const result = new Map<string, Date>();
  for (const s of staff) {
    const rule = rules.find((r) => r.businessId === s.businessId) ?? DEFAULT_RULE;
    const bizHours = hours.filter((h) => h.businessId === s.businessId);
    const bizBlocks = blocks.filter((b) => b.businessId === s.businessId);
    const duration = s.services[0]?.durationMin ?? 60;
    const earliest = now.getTime() + rule.minLeadMinutes * 60_000;
    for (let i = 0; i < days; i++) {
      const day = addDays(start, i);
      const slots = computeStaffSlots({
        dayStart: day,
        schedule: resolveSchedule(bizHours, s.id, ubParts(day).weekday),
        durationMin: duration,
        stepMin: rule.slotStepMin,
        bufferMin: rule.bufferMin,
        busy: busyFor(s.id, appointments, bizBlocks),
        earliest,
        latest: Number.MAX_SAFE_INTEGER,
      });
      if (slots.length) {
        const at = addMinutes(day, slots[0]);
        const key = scope.staffIds ? s.id : s.businessId;
        const prev = result.get(key);
        if (!prev || at < prev) result.set(key, at);
        break;
      }
    }
  }
  return result;
}

/** Re-validates a specific slot for a specific staff member. Used inside booking transactions. */
export async function isSlotFree(params: {
  businessId: string;
  serviceId: string;
  staffId: string;
  startAt: Date;
  ignoreAppointmentId?: string;
  bypassRules?: boolean;
  now?: Date;
}): Promise<boolean> {
  const slots = await getAvailableSlots({
    businessId: params.businessId,
    serviceId: params.serviceId,
    staffId: params.staffId,
    dateKey: toDateKey(params.startAt),
    ignoreAppointmentId: params.ignoreAppointmentId,
    bypassRules: params.bypassRules,
    now: params.now,
  });
  return slots.some((s) => s.startAt === params.startAt.toISOString());
}
