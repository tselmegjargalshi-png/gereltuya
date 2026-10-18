"use client";

import { ChevronLeft, ChevronRight, CalendarOff, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { SlotPicker, type PickerSlot } from "@/components/booking/slot-picker";
import { AppointmentActions } from "@/components/owner/appointment-actions";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatLongDate, formatMoney, formatMonthYear, formatTime, WEEKDAYS_SHORT } from "@/lib/format";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/labels";
import { addDays, addMinutes, daysInMonth, fromDateKey, toDateKey, ubDate, ubMinutesOfDay, ubParts, ubStartOfWeek } from "@/lib/time";
import {
  createBlockedTimeAction,
  createOwnerAppointmentAction,
  deleteBlockedTimeAction,
  getOwnerAppointmentDaysAction,
  getOwnerAppointmentSlotsAction,
  getOwnerDaysAction,
  getOwnerSlotsAction,
  moveAppointmentAction,
  updateAppointmentNoteAction,
} from "@/server/actions/owner-appointments";

export type CalStaff = { id: string; name: string; color: string; title: string; serviceIds: string[] };
export type CalAppt = {
  id: string;
  staffId: string;
  serviceName: string;
  customerName: string;
  phone: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  price: number;
  note: string;
  code: string;
};
export type CalBlock = { id: string; staffId: string | null; startAt: string; endAt: string; reason: string };
export type CalHours = { staffId: string | null; weekday: number; open: number; close: number; closed: boolean };
type Service = { id: string; name: string; durationMin: number; price: number };
type View = "day" | "week" | "month";

const HOUR_PX = 64;
const SNAP = 15;

type Column = { key: string; title: string; sub: string; dateKey: string; staffId: string | null; today: boolean };

type Props = {
  view: View;
  dateKey: string;
  todayKey: string;
  staffFilter: string;
  staff: CalStaff[];
  services: Service[];
  appointments: CalAppt[];
  blocks: CalBlock[];
  hours: CalHours[];
  startHour: number;
  endHour: number;
  nowIso: string;
};

export function CalendarBoard(props: Props) {
  const { view, dateKey, todayKey, staffFilter, staff, services, appointments, blocks, hours, startHour, endHour } = props;
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [create, setCreate] = useState<{ dateKey: string; minutes: number | null; staffId: string | null } | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const dragRef = useRef<{ id: string; grabMin: number; dur: number } | null>(null);
  const [preview, setPreview] = useState<{ col: string; top: number; height: number } | null>(null);

  const go = (patch: { view?: View; date?: string; staff?: string }) => {
    const p = new URLSearchParams();
    p.set("view", patch.view ?? view);
    p.set("date", patch.date ?? dateKey);
    const s = patch.staff ?? staffFilter;
    if (s !== "all") p.set("staff", s);
    router.push(`/owner/calendar?${p.toString()}`);
  };

  const anchor = fromDateKey(dateKey)!;
  const step = (dir: 1 | -1) => {
    if (view === "month") {
      const p = ubParts(anchor);
      const d = ubDate(p.year, p.month + dir, 1);
      go({ date: toDateKey(d) });
    } else go({ date: toDateKey(addDays(anchor, dir * (view === "week" ? 7 : 1))) });
  };

  const label = useMemo(() => {
    if (view === "day") return formatLongDate(anchor);
    if (view === "week") {
      const s = ubStartOfWeek(anchor);
      return `${formatDayMonth(s)} - ${formatDayMonth(addDays(s, 6))}`;
    }
    return formatMonthYear(anchor);
  }, [view, anchor]);

  const visibleStaff = staffFilter === "all" ? staff : staff.filter((s) => s.id === staffFilter);

  const columns: Column[] = useMemo(() => {
    if (view === "day") {
      return visibleStaff.map((s) => ({ key: s.id, title: s.name, sub: s.title, dateKey, staffId: s.id, today: dateKey === todayKey }));
    }
    const s = ubStartOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(s, i);
      const k = toDateKey(d);
      return { key: k, title: WEEKDAYS_SHORT[i], sub: String(ubParts(d).day), dateKey: k, staffId: staffFilter === "all" ? null : staffFilter, today: k === todayKey };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dateKey, todayKey, staffFilter, staff]);

  const detail = appointments.find((a) => a.id === detailId) ?? null;

  const scheduleFor = (staffId: string | null, weekday: number) => {
    const own = staffId ? hours.find((h) => h.staffId === staffId && h.weekday === weekday) : undefined;
    return own ?? hours.find((h) => h.staffId === null && h.weekday === weekday);
  };

  const minutesFromY = (el: HTMLElement, clientY: number) => {
    const rect = el.getBoundingClientRect();
    return startHour * 60 + ((clientY - rect.top) / HOUR_PX) * 60;
  };
  const snap = (m: number) => Math.round(m / SNAP) * SNAP;

  const onDrop = (col: Column, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const drag = dragRef.current;
    dragRef.current = null;
    setPreview(null);
    if (!drag) return;
    const raw = snap(minutesFromY(e.currentTarget, e.clientY) - drag.grabMin);
    const minutes = Math.max(startHour * 60, Math.min(raw, endHour * 60 - SNAP));
    const startAt = addMinutes(fromDateKey(col.dateKey)!, minutes);
    const current = appointments.find((a) => a.id === drag.id);
    if (current && new Date(current.startAt).getTime() === startAt.getTime() && (!col.staffId || col.staffId === current.staffId)) return;
    startTransition(async () => {
      const res = await moveAppointmentAction(drag.id, startAt.toISOString(), view === "day" ? (col.staffId ?? undefined) : undefined);
      if (res.error) toast(res.error, "error");
      else {
        toast("Захиалгын цаг шинэчлэгдлээ.");
        router.refresh();
      }
    });
  };

  const totalHeight = (endHour - startHour) * HOUR_PX;
  const hourLabels = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Өмнөх" onClick={() => step(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Дараах" onClick={() => step(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => go({ date: todayKey })}>
            Өнөөдөр
          </Button>
          <p className="ml-2 text-[15px] font-semibold" aria-live="polite">
            {label}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            id="cal-view"
            value={view}
            onChange={(v) => go({ view: v })}
            options={[
              { value: "day", label: "Өдөр" },
              { value: "week", label: "7 хоног" },
              { value: "month", label: "Сар" },
            ]}
          />
          <Select aria-label="Мэргэжилтэн" value={staffFilter} onChange={(e) => go({ staff: e.target.value })} className="h-10 w-52 rounded-full text-[13px]">
            <option value="all">Бүх мэргэжилтэн</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={() => setBlockOpen(true)}>
            <CalendarOff className="h-4 w-4" aria-hidden />
            Цаг хаах
          </Button>
          <Button size="sm" onClick={() => setCreate({ dateKey: view === "month" ? todayKey : dateKey, minutes: null, staffId: staffFilter === "all" ? null : staffFilter })}>
            <Plus className="h-4 w-4" aria-hidden />
            Цаг нэмэх
          </Button>
        </div>
      </div>

      {staff.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-sand p-10 text-center text-sm text-stone">Календарь харахын тулд эхлээд мэргэжилтэн нэмнэ үү.</p>
      ) : view === "month" ? (
        <MonthGrid dateKey={dateKey} todayKey={todayKey} appointments={appointments} staffFilter={staffFilter} onPick={(k) => go({ view: "day", date: k })} />
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
          <div className="overflow-x-auto">
            <div style={{ minWidth: 56 + columns.length * (view === "day" ? 168 : 128) }}>
              <div className="flex border-b border-line bg-surface">
                <div className="w-14 shrink-0" />
                {columns.map((c) => (
                  <div key={c.key} className="min-w-0 flex-1 border-l border-line px-2 py-2.5 text-center">
                    <p className={cn("truncate text-[13px] font-semibold", c.today && view === "week" && "text-accent")}>{c.title}</p>
                    <p className={cn("truncate text-[12px] text-mute", c.today && view === "week" && "font-semibold text-accent")}>{c.sub}</p>
                  </div>
                ))}
              </div>
              <div className="flex">
                <div className="relative w-14 shrink-0" style={{ height: totalHeight }}>
                  {hourLabels.slice(0, -1).map((h, i) => (
                    <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] text-mute tabular" style={{ top: i * HOUR_PX + (i === 0 ? 8 : 0) }}>
                      {String(h).padStart(2, "0")}:00
                    </span>
                  ))}
                </div>
                {columns.map((c) => {
                  const colDate = fromDateKey(c.dateKey)!;
                  const weekday = ubParts(colDate).weekday;
                  const sched = scheduleFor(c.staffId, weekday);
                  const items = layoutLanes(
                    appointments.filter((a) => toDateKey(new Date(a.startAt)) === c.dateKey && (!c.staffId || a.staffId === c.staffId)),
                  );
                  const colBlocks = blocks.filter((b) => (!b.staffId || !c.staffId || b.staffId === c.staffId) && toDateKey(new Date(b.startAt)) <= c.dateKey && toDateKey(new Date(b.endAt)) >= c.dateKey);
                  const nowMin = c.today ? ubMinutesOfDay(new Date(props.nowIso)) : null;
                  return (
                    <div
                      key={c.key}
                      className="relative min-w-0 flex-1 cursor-cell border-l border-line"
                      style={{ height: totalHeight }}
                      onClick={(e) => {
                        if (e.target !== e.currentTarget) return;
                        const minutes = Math.floor(minutesFromY(e.currentTarget, e.clientY) / 30) * 30;
                        setCreate({ dateKey: c.dateKey, minutes, staffId: c.staffId });
                      }}
                      onDragOver={(e) => {
                        if (!dragRef.current) return;
                        e.preventDefault();
                        const drag = dragRef.current;
                        const raw = snap(minutesFromY(e.currentTarget, e.clientY) - drag.grabMin);
                        const m = Math.max(startHour * 60, Math.min(raw, endHour * 60 - SNAP));
                        setPreview({ col: c.key, top: ((m - startHour * 60) / 60) * HOUR_PX, height: (drag.dur / 60) * HOUR_PX });
                      }}
                      onDrop={(e) => onDrop(c, e)}
                    >
                      {hourLabels.slice(0, -1).map((h, i) => (
                        <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ top: i * HOUR_PX }} />
                      ))}
                      {!sched || sched.closed ? (
                        <div className="pointer-events-none absolute inset-0 bg-ivory/80" aria-hidden />
                      ) : (
                        <>
                          <Shade from={startHour * 60} to={sched.open} startHour={startHour} />
                          <Shade from={sched.close} to={endHour * 60} startHour={startHour} />
                        </>
                      )}
                      {colBlocks.map((b) => {
                        const s = Math.max(new Date(b.startAt).getTime(), colDate.getTime());
                        const eMs = Math.min(new Date(b.endAt).getTime(), addDays(colDate, 1).getTime());
                        const top = ((ubMinutesOfDay(new Date(s)) - startHour * 60) / 60) * HOUR_PX;
                        const h = ((eMs - s) / 60000 / 60) * HOUR_PX;
                        return (
                          <div
                            key={b.id}
                            className="pointer-events-none absolute inset-x-0.5 overflow-hidden rounded-[6px] border border-sand bg-[repeating-linear-gradient(135deg,var(--color-ivory),var(--color-ivory)_6px,var(--color-sand)_6px,var(--color-sand)_7px)] px-1.5 py-1 text-[11px] text-stone"
                            style={{ top: Math.max(top, 0), height: Math.max(h, 18) }}
                          >
                            {b.reason || "Хаасан цаг"}
                          </div>
                        );
                      })}
                      {items.map(({ appt: a, lane, lanes }) => {
                        const st = staff.find((s) => s.id === a.staffId);
                        const start = new Date(a.startAt);
                        const dur = (new Date(a.endAt).getTime() - start.getTime()) / 60000;
                        const top = ((ubMinutesOfDay(start) - startHour * 60) / 60) * HOUR_PX;
                        const draggable = a.status === "PENDING" || a.status === "CONFIRMED";
                        return (
                          <button
                            key={a.id}
                            type="button"
                            draggable={draggable}
                            onDragStart={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              dragRef.current = { id: a.id, grabMin: snap(((e.clientY - rect.top) / HOUR_PX) * 60), dur };
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", a.id);
                            }}
                            onDragEnd={() => {
                              dragRef.current = null;
                              setPreview(null);
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailId(a.id);
                            }}
                            aria-label={`${formatTime(start)}, ${a.customerName}, ${a.serviceName}, ${STATUS_LABEL[a.status]}`}
                            className={cn(
                              "absolute overflow-hidden rounded-[8px] border-l-[3px] px-2 py-1 text-left text-[12px] leading-tight shadow-[0_1px_2px_rgba(30,22,16,0.08)] transition-shadow hover:z-10 hover:shadow-[var(--shadow-lift)] focus-visible:z-10",
                              draggable ? "cursor-grab active:cursor-grabbing" : "opacity-60",
                              a.status === "PENDING" && "border-dashed",
                            )}
                            style={{
                              top: Math.max(top, 0),
                              height: Math.max((dur / 60) * HOUR_PX - 2, 20),
                              left: `calc(${(lane / lanes) * 100}% + 2px)`,
                              width: `calc(${100 / lanes}% - 4px)`,
                              borderLeftColor: st?.color ?? "#8e4f36",
                              backgroundColor: `color-mix(in srgb, ${st?.color ?? "#8e4f36"} 13%, #fff)`,
                            }}
                          >
                            <span className="block truncate font-semibold text-ink">{a.customerName}</span>
                            <span className="block truncate text-stone">{a.serviceName}</span>
                            {dur >= 45 ? <span className="block truncate text-[11px] text-mute tabular">{formatTime(start)} - {formatTime(new Date(a.endAt))}</span> : null}
                          </button>
                        );
                      })}
                      {nowMin !== null && nowMin >= startHour * 60 && nowMin <= endHour * 60 ? (
                        <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((nowMin - startHour * 60) / 60) * HOUR_PX }} aria-hidden>
                          <span className="-ml-1 h-2 w-2 rounded-full bg-accent" />
                          <span className="h-px flex-1 bg-accent" />
                        </div>
                      ) : null}
                      {preview?.col === c.key ? (
                        <div className="pointer-events-none absolute inset-x-1 z-20 rounded-[8px] border-2 border-dashed border-accent bg-accent/10" style={{ top: preview.top, height: preview.height }} aria-hidden />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-[12px] text-mute">Захиалгыг чирж өөр цаг, өөр мэргэжилтэнд шилжүүлнэ. Утсан дээр захиалгыг дарж цагийг нь өөрчилнө.</p>

      {detail ? (
        <DetailModal
          key={detail.id}
          appt={detail}
          staff={staff}
          onClose={() => setDetailId(null)}
          onMoved={() => {
            setDetailId(null);
            router.refresh();
          }}
        />
      ) : null}
      {create ? <CreateModal init={create} staff={staff} services={services} onClose={() => setCreate(null)} onDone={(k) => { setCreate(null); if (k !== dateKey && view === "day") go({ date: k }); else router.refresh(); }} /> : null}
      {blockOpen ? <BlockModal staff={staff} blocks={blocks} defaultDate={view === "month" ? todayKey : dateKey} onClose={() => setBlockOpen(false)} /> : null}
    </div>
  );
}

function Shade({ from, to, startHour }: { from: number; to: number; startHour: number }) {
  if (to <= from) return null;
  const top = ((from - startHour * 60) / 60) * HOUR_PX;
  const height = ((to - from) / 60) * HOUR_PX;
  return <div className="pointer-events-none absolute inset-x-0 bg-ivory/80" style={{ top, height }} aria-hidden />;
}

function layoutLanes(list: CalAppt[]): { appt: CalAppt; lane: number; lanes: number }[] {
  const sorted = [...list].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const out: { appt: CalAppt; lane: number; lanes: number }[] = [];
  let cluster: { appt: CalAppt; lane: number; end: number }[] = [];
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    for (const c of cluster) out.push({ appt: c.appt, lane: c.lane, lanes });
    cluster = [];
  };
  let clusterEnd = 0;
  for (const a of sorted) {
    const s = new Date(a.startAt).getTime();
    const e = new Date(a.endAt).getTime();
    if (cluster.length && s >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.end > s).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ appt: a, lane, end: e });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
}

function MonthGrid({ dateKey, todayKey, appointments, staffFilter, onPick }: { dateKey: string; todayKey: string; appointments: CalAppt[]; staffFilter: string; onPick: (k: string) => void }) {
  const first = fromDateKey(dateKey)!;
  const p = ubParts(first);
  const lead = ubParts(ubDate(p.year, p.month, 1)).weekday;
  const total = daysInMonth(p.year, p.month);
  const cells = Math.ceil((lead + total) / 7) * 7;
  const byDay = new Map<string, CalAppt[]>();
  for (const a of appointments) {
    if (staffFilter !== "all" && a.staffId !== staffFilter) continue;
    const k = toDateKey(new Date(a.startAt));
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line text-center text-[12px] font-medium text-stone">
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} className="py-2.5">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: cells }, (_, i) => {
          const day = i - lead + 1;
          if (day < 1 || day > total) return <div key={i} className="min-h-24 border-b border-r border-line bg-ivory/50 md:min-h-32" />;
          const k = toDateKey(ubDate(p.year, p.month, day));
          const list = byDay.get(k) ?? [];
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(k)}
              aria-label={`${p.month}-р сарын ${day}, ${list.length} захиалга`}
              className={cn("min-h-24 border-b border-r border-line p-1.5 text-left transition-colors hover:bg-ivory/60 md:min-h-32 md:p-2", k === todayKey && "bg-accent-soft/40")}
            >
              <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-medium", k === todayKey && "bg-accent text-paper")}>{day}</span>
              <span className="mt-1 hidden space-y-0.5 md:block">
                {list.slice(0, 3).map((a) => (
                  <span key={a.id} className="block truncate rounded bg-ivory px-1.5 py-0.5 text-[11px]">
                    <span className="tabular text-mute">{formatTime(new Date(a.startAt))}</span> {a.customerName}
                  </span>
                ))}
                {list.length > 3 ? <span className="block px-1.5 text-[11px] text-mute">+{list.length - 3} бусад</span> : null}
              </span>
              {list.length ? <span className="mt-1 block text-[11px] font-medium text-accent md:hidden">{list.length} захиалга</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailModal({ appt, staff, onClose, onMoved }: { appt: CalAppt; staff: CalStaff[]; onClose: () => void; onMoved: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [moving, setMoving] = useState(false);
  const [slot, setSlot] = useState<PickerSlot | null>(null);
  const [note, setNote] = useState(appt.note);
  const [pending, start] = useTransition();
  const st = staff.find((s) => s.id === appt.staffId);
  const startD = new Date(appt.startAt);
  const active = appt.status === "PENDING" || appt.status === "CONFIRMED";

  const saveNote = () =>
    start(async () => {
      const res = await updateAppointmentNoteAction(appt.id, note);
      if (res.error) toast(res.error, "error");
      else {
        toast("Тэмдэглэл хадгалагдлаа.");
        router.refresh();
      }
    });
  const confirmMove = () => {
    if (!slot) return;
    start(async () => {
      const res = await moveAppointmentAction(appt.id, slot.startAt);
      if (res.error) toast(res.error, "error");
      else {
        toast("Захиалгын цаг шинэчлэгдлээ.");
        onMoved();
      }
    });
  };

  return (
    <Modal open onClose={onClose} title={appt.customerName} description={`${appt.serviceName}, ${st?.name ?? ""}`} size="md">
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[14px]">
          <div>
            <dt className="text-[12px] text-mute">Огноо</dt>
            <dd className="font-medium">{formatLongDate(startD)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-mute">Цаг</dt>
            <dd className="font-medium tabular">
              {formatTime(startD)} - {formatTime(new Date(appt.endAt))}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-mute">Утас</dt>
            <dd className="font-medium tabular">
              <a href={`tel:${appt.phone.replace(/\s/g, "")}`} className="hover:text-accent">
                {appt.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-mute">Үнэ</dt>
            <dd className="font-medium tabular">{formatMoney(appt.price)}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-mute">Төлөв</dt>
            <dd>
              <Badge tone={STATUS_TONE[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] text-mute">Код</dt>
            <dd className="font-medium tabular">{appt.code}</dd>
          </div>
        </dl>

        <Field label="Тэмдэглэл" htmlFor={`note-${appt.id}`}>
          <Textarea id={`note-${appt.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="min-h-20" />
          {note !== appt.note ? (
            <Button size="sm" variant="secondary" className="mt-2" loading={pending} onClick={saveNote}>
              Тэмдэглэл хадгалах
            </Button>
          ) : null}
        </Field>

        {active ? (
          <div className="space-y-4 border-t border-line pt-5">
            <AppointmentActions id={appt.id} status={appt.status} customerName={appt.customerName} />
            {moving ? (
              <div className="space-y-4 rounded-[14px] bg-ivory/60 p-4">
                <SlotPicker
                  deps={[appt.id]}
                  value={slot?.startAt ?? null}
                  onChange={setSlot}
                  loadDays={() => getOwnerAppointmentDaysAction(appt.id)}
                  loadSlots={(k) => getOwnerAppointmentSlotsAction(appt.id, k)}
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={!slot} loading={pending} onClick={confirmMove}>
                    Цагийг шилжүүлэх
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setMoving(false)}>
                    Болих
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setMoving(true)}>
                Цаг өөрчлөх
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function CreateModal({
  init,
  staff,
  services,
  onClose,
  onDone,
}: {
  init: { dateKey: string; minutes: number | null; staffId: string | null };
  staff: CalStaff[];
  services: Service[];
  onClose: () => void;
  onDone: (dateKey: string) => void;
}) {
  const toast = useToast();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(init.staffId ?? "");
  const [slot, setSlot] = useState<PickerSlot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const eligible = staff.filter((s) => s.serviceIds.includes(serviceId));
  const effectiveStaff = eligible.some((s) => s.id === staffId) ? staffId : (eligible[0]?.id ?? "");

  const submit = () => {
    setErrors({});
    setError(undefined);
    if (!slot) return setError("Цаг сонгоно уу.");
    start(async () => {
      const res = await createOwnerAppointmentAction({ serviceId, staffId: effectiveStaff, startAt: slot.startAt, name, phone, note });
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.error) setError(res.error);
      else {
        toast("Шинэ захиалга нэмэгдлээ.");
        onDone(toDateKey(new Date(slot.startAt)));
      }
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Шинэ цаг нэмэх"
      description="Утсаар эсвэл биечлэн ирсэн үйлчлүүлэгчийн цагийг бүртгэнэ."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Болих
          </Button>
          <Button loading={pending} onClick={submit}>
            Цаг нэмэх
          </Button>
        </>
      }
    >
      {services.length === 0 ? (
        <p className="text-sm text-stone">Эхлээд үйлчилгээ нэмнэ үү.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Үйлчилгээ" htmlFor="c-service" error={errors.serviceId}>
              <Select id="c-service" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlot(null); }}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMin} мин)
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Мэргэжилтэн" htmlFor="c-staff" error={errors.staffId}>
              <Select id="c-staff" value={effectiveStaff} onChange={(e) => { setStaffId(e.target.value); setSlot(null); }}>
                {eligible.length === 0 ? <option value="">Энэ үйлчилгээ үзүүлэх мэргэжилтэн алга</option> : null}
                {eligible.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {effectiveStaff ? (
            <SlotPicker
              key={`${serviceId}-${effectiveStaff}`}
              deps={[serviceId, effectiveStaff]}
              value={slot?.startAt ?? null}
              onChange={setSlot}
              initialDate={init.dateKey >= toDateKey(new Date()) ? init.dateKey : undefined}
              loadDays={() => getOwnerDaysAction({ serviceId, staffId: effectiveStaff })}
              loadSlots={(k) => getOwnerSlotsAction({ serviceId, staffId: effectiveStaff, dateKey: k })}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Үйлчлүүлэгчийн нэр" htmlFor="c-name" error={errors.name}>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </Field>
            <Field label="Утасны дугаар" htmlFor="c-phone" error={errors.phone}>
              <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="9911 2233" autoComplete="off" />
            </Field>
          </div>
          <Field label="Тэмдэглэл" htmlFor="c-note">
            <Input id="c-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </Field>
          {error ? (
            <p role="alert" className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}

function BlockModal({ staff, blocks, defaultDate, onClose }: { staff: CalStaff[]; blocks: CalBlock[]; defaultDate: string; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [from, setFrom] = useState("13:00");
  const [to, setTo] = useState("14:00");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const toIso = (hhmm: string) => {
    const base = fromDateKey(date);
    if (!base) return "";
    const [h, m] = hhmm.split(":").map(Number);
    return addMinutes(base, h * 60 + m).toISOString();
  };

  const submit = () =>
    start(async () => {
      setErrors({});
      const res = await createBlockedTimeAction({ staffId: staffId || undefined, startAt: toIso(from), endAt: toIso(to), reason });
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.error) toast(res.error, "error");
      else {
        toast("Цаг хаагдлаа.");
        router.refresh();
        onClose();
      }
    });
  const remove = (id: string) =>
    start(async () => {
      const res = await deleteBlockedTimeAction(id);
      if (res.error) toast(res.error, "error");
      else {
        toast("Хаасан цаг устгагдлаа.");
        router.refresh();
      }
    });

  return (
    <Modal
      open
      onClose={onClose}
      title="Цаг хаах"
      description="Амралт, завсарлага зэрэг үед онлайн захиалга авахгүй байхаар хаана."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Болих
          </Button>
          <Button loading={pending} onClick={submit}>
            Хаах
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Хэнд хамаарах вэ" htmlFor="b-staff">
          <Select id="b-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Бүх мэргэжилтэн</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Огноо" htmlFor="b-date">
            <Input id="b-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Эхлэх цаг" htmlFor="b-from" error={errors.startAt}>
            <Input id="b-from" type="time" step={900} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Дуусах цаг" htmlFor="b-to" error={errors.endAt}>
            <Input id="b-to" type="time" step={900} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        <Field label="Шалтгаан (заавал биш)" htmlFor="b-reason">
          <Input id="b-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="Жишээ нь: Өдрийн цай" />
        </Field>
        {blocks.length ? (
          <div className="border-t border-line pt-4">
            <p className="mb-2 text-[13px] font-medium">Одоо хаасан цагууд</p>
            <ul className="space-y-2">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 rounded-[10px] bg-ivory px-3 py-2 text-[13px]">
                  <span>
                    {formatDayMonth(new Date(b.startAt))}, <span className="tabular">{formatTime(new Date(b.startAt))} - {formatTime(new Date(b.endAt))}</span>
                    {b.staffId ? ` · ${staff.find((s) => s.id === b.staffId)?.name ?? ""}` : " · Бүгд"}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </span>
                  <button type="button" onClick={() => remove(b.id)} className="shrink-0 font-medium text-danger hover:underline">
                    Устгах
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
