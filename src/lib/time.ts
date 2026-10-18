/**
 * Time helpers for Asia/Ulaanbaatar (UTC+8, no daylight saving).
 * All appointment timestamps are stored in UTC; schedules are expressed in local "HH:MM".
 */
export const UB_OFFSET_MIN = 8 * 60;
const MS_MIN = 60_000;
const MS_DAY = 86_400_000;

export type UbParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

/** weekday: 0 = Monday ... 6 = Sunday */
export function ubParts(date: Date): UbParts {
  const shifted = new Date(date.getTime() + UB_OFFSET_MIN * MS_MIN);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    weekday: (shifted.getUTCDay() + 6) % 7,
  };
}

export function ubDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - UB_OFFSET_MIN * MS_MIN);
}

export function ubStartOfDay(date: Date): Date {
  const p = ubParts(date);
  return ubDate(p.year, p.month, p.day);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_DAY);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_MIN);
}

export function ubStartOfWeek(date: Date): Date {
  const start = ubStartOfDay(date);
  return addDays(start, -ubParts(date).weekday);
}

export function ubStartOfMonth(date: Date): Date {
  const p = ubParts(date);
  return ubDate(p.year, p.month, 1);
}

export function ubStartOfYear(date: Date): Date {
  return ubDate(ubParts(date).year, 1, 1);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "YYYY-MM-DD" in Ulaanbaatar time */
export function toDateKey(date: Date): string {
  const p = ubParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function fromDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return ubDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToHhmm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Minutes since local midnight */
export function ubMinutesOfDay(date: Date): number {
  const p = ubParts(date);
  return p.hour * 60 + p.minute;
}

export function isSameUbDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}
