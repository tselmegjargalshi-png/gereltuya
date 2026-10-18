import { addDays, isSameUbDay, ubParts, minutesToHhmm, ubMinutesOfDay } from "./time";

export const WEEKDAYS = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба", "Ням"];
export const WEEKDAYS_SHORT = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

export function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")}₮`;
}

export function formatCompactMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")} сая₮`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} мянга₮`;
  return formatMoney(value);
}

export function formatTime(date: Date): string {
  return minutesToHhmm(ubMinutesOfDay(date));
}

/** "10-р сарын 21" */
export function formatDayMonth(date: Date): string {
  const p = ubParts(date);
  return `${p.month}-р сарын ${p.day}`;
}

/** "2026.10.15" */
export function formatDateDots(date: Date): string {
  const p = ubParts(date);
  return `${p.year}.${String(p.month).padStart(2, "0")}.${String(p.day).padStart(2, "0")}`;
}

/** "Лхагва, 10-р сарын 21" */
export function formatLongDate(date: Date): string {
  return `${WEEKDAYS[ubParts(date).weekday]}, ${formatDayMonth(date)}`;
}

export function formatMonthYear(date: Date): string {
  const p = ubParts(date);
  return `${p.year} оны ${p.month}-р сар`;
}

/** "Өнөөдөр", "Маргааш" or "10-р сарын 21" */
export function formatRelativeDay(date: Date, now = new Date()): string {
  if (isSameUbDay(date, now)) return "Өнөөдөр";
  if (isSameUbDay(date, addDays(now, 1))) return "Маргааш";
  return formatDayMonth(date);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} минут`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} цаг ${m} минут` : `${h} цаг`;
}

export function formatRating(value: number): string {
  return value.toFixed(1);
}

export function formatRelativeTime(date: Date, now = new Date()): string {
  const diff = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (diff < 1) return "Дөнгөж сая";
  if (diff < 60) return `${diff} минутын өмнө`;
  const hours = Math.round(diff / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} өдрийн өмнө`;
  return formatDateDots(date);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

/** "Өнөөдөр 15:30 боломжтой" */
export function formatNextAvailable(iso: string | Date | null | undefined, now = new Date()): string {
  if (!iso) return "Ойрын хугацаанд цаг байхгүй";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${formatRelativeDay(d, now)} ${formatTime(d)} боломжтой`;
}
