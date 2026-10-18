"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, Clock, MapPin, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Button, buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatDuration, formatMoney, WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/format";
import { createBookingAction } from "@/server/actions/customer";

export type WizardService = { id: string; name: string; description: string; durationMin: number; price: number; category: string; staffIds: string[] };
export type WizardStaff = { id: string; name: string; title: string; photoUrl: string | null; ratingAvg: number; reviewCount: number; experienceYears: number };

type Props = {
  business: { id: string; slug: string; name: string; address: string };
  services: WizardService[];
  staff: WizardStaff[];
  user: { name: string } | null;
  todayKey: string;
  base: string;
  initial: { service?: string; staff?: string; date?: string; time?: string };
};

const STEPS = ["Үйлчилгээ сонгох", "Мэргэжилтэн сонгох", "Огноо сонгох", "Цаг сонгох", "Захиалгаа баталгаажуулах"] as const;
const ANY = "any";

type Slot = { time: string; startAt: string; staffIds: string[] };

function keyParts(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d, weekday: (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7 };
}
const dayLabel = (key: string) => {
  const p = keyParts(key);
  return `${p.m}-р сарын ${p.d}`;
};
const longDayLabel = (key: string) => `${WEEKDAYS[keyParts(key).weekday]}, ${dayLabel(key)}`;

export function BookingWizard({ business, services, staff, user, todayKey, base, initial }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pending, start] = useTransition();

  const initialService = services.find((s) => s.id === initial.service)?.id ?? null;
  const initialStaffValid = initial.staff && staff.some((s) => s.id === initial.staff) ? initial.staff : null;
  const [serviceId, setServiceId] = useState<string | null>(initialService);
  const [staffId, setStaffId] = useState<string | null>(
    initialService && initialStaffValid && services.find((s) => s.id === initialService)?.staffIds.includes(initialStaffValid) ? initialStaffValid : null,
  );
  const [date, setDate] = useState<string | null>(initial.date ?? null);
  const [time, setTime] = useState<string | null>(initial.time ?? null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const staffOptions = useMemo(() => (service ? staff.filter((s) => service.staffIds.includes(s.id)) : []), [service, staff]);

  const [dayCounts, setDayCounts] = useState<Record<string, number> | null>(null);
  const [daysError, setDaysError] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);

  const stepFromState = !serviceId ? 0 : !staffId ? 1 : !date ? 2 : !time ? 3 : 4;
  const [step, setStep] = useState(stepFromState);
  const [direction, setDirection] = useState(1);
  const goTo = useCallback((next: number) => {
    setStep((cur) => {
      setDirection(next >= cur ? 1 : -1);
      return next;
    });
  }, []);

  // Keep the URL in sync, so a refresh or a sign-in redirect brings the customer back to the same place.
  useEffect(() => {
    const qs = new URLSearchParams();
    if (serviceId) qs.set("service", serviceId);
    if (staffId) qs.set("staff", staffId);
    if (date) qs.set("date", date);
    if (time) qs.set("time", time);
    window.history.replaceState(null, "", `${base}/book/${business.slug}${qs.size ? `?${qs}` : ""}`);
  }, [serviceId, staffId, date, time, base, business.slug]);

  // Initial deep link: jump to the first step that still needs an answer.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setStep(stepFromState);
  }, [stepFromState]);

  // Availability by day.
  useEffect(() => {
    if (!serviceId || !staffId) return;
    let cancelled = false;
    setDayCounts(null);
    setDaysError(false);
    const qs = new URLSearchParams({ businessId: business.id, serviceId, days: "28" });
    if (staffId !== ANY) qs.set("staffId", staffId);
    fetch(`/api/availability?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => !cancelled && setDayCounts(j.days))
      .catch(() => !cancelled && setDaysError(true));
    return () => {
      cancelled = true;
    };
  }, [business.id, serviceId, staffId]);

  // Slots for the selected day.
  useEffect(() => {
    if (!serviceId || !staffId || !date) return;
    let cancelled = false;
    setSlots(null);
    setSlotsError(false);
    const qs = new URLSearchParams({ businessId: business.id, serviceId, date });
    if (staffId !== ANY) qs.set("staffId", staffId);
    fetch(`/api/availability?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (cancelled) return;
        setSlots(j.slots);
        setTime((t) => (t && !j.slots.some((s: Slot) => s.time === t) ? null : t));
      })
      .catch(() => !cancelled && setSlotsError(true));
    return () => {
      cancelled = true;
    };
  }, [business.id, serviceId, staffId, date]);

  const selectedSlot = slots?.find((s) => s.time === time) ?? null;
  const chosenStaff = staffId && staffId !== ANY ? staff.find((s) => s.id === staffId) : null;

  const selectService = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id)!;
    if (staffId && staffId !== ANY && !svc.staffIds.includes(staffId)) setStaffId(null);
    setTime(null);
    goTo(staffId && (staffId === ANY || svc.staffIds.includes(staffId)) ? (date ? 3 : 2) : 1);
  };
  const selectStaff = (id: string) => {
    setStaffId(id);
    setTime(null);
    goTo(date ? 3 : 2);
  };
  const selectDate = (key: string) => {
    setDate(key);
    setTime(null);
    goTo(3);
  };
  const selectTime = (t: string) => {
    setTime(t);
    goTo(4);
  };

  const confirm = () => {
    if (!service || !selectedSlot) return;
    setError(null);
    start(async () => {
      const res = await createBookingAction({
        businessId: business.id,
        serviceId: service.id,
        staffId: staffId && staffId !== ANY ? staffId : undefined,
        startAt: selectedSlot.startAt,
        note: note || undefined,
      });
      if (res.ok && res.data) router.push(`/app/bookings/${res.data.appointmentId}?success=1`);
      else {
        setError(res.error ?? "Таны захиалгыг баталгаажуулж чадсангүй.");
        // Slot might have been taken meanwhile: refresh the list.
        setTime(null);
        goTo(3);
      }
    });
  };

  const loginHref = (path: string) => {
    const qs = new URLSearchParams();
    if (serviceId) qs.set("service", serviceId);
    if (staffId) qs.set("staff", staffId);
    if (date) qs.set("date", date);
    if (time) qs.set("time", time);
    return `${path}?next=${encodeURIComponent(`${base}/book/${business.slug}?${qs}`)}`;
  };

  const maxStep = Math.max(stepFromState, step);

  return (
    <div className="container-page py-6 md:py-10">
      <Link href={`${base}/b/${business.slug}`} className="inline-flex items-center gap-1 text-sm text-stone hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {business.name}
      </Link>
      <h1 className="mt-4 font-display text-[2.2rem] leading-tight md:text-[3rem]">Цаг захиалах</h1>

      <ol className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Захиалгын алхам">
        {STEPS.map((label, i) => {
          const done = i < stepFromState && i !== step;
          const reachable = i <= maxStep && i <= stepFromState;
          return (
            <li key={label} className="shrink-0">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => goTo(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] transition-colors",
                  i === step ? "border-ink bg-ink text-paper" : done ? "border-sand bg-surface text-ink hover:border-ink/50" : "border-line text-mute",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                    i === step ? "bg-paper text-ink" : done ? "bg-success text-white" : "bg-ivory text-mute",
                  )}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-h-[420px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 ? (
                <StepServices services={services} selected={serviceId} onSelect={selectService} />
              ) : step === 1 && service ? (
                <StepStaff staff={staffOptions} selected={staffId} onSelect={selectStaff} />
              ) : step === 2 ? (
                <StepDate todayKey={todayKey} counts={dayCounts} failed={daysError} selected={date} onSelect={selectDate} />
              ) : step === 3 ? (
                <StepTime slots={slots} failed={slotsError} selected={time} onSelect={selectTime} date={date} />
              ) : service && selectedSlot && date ? (
                <StepConfirm
                  error={error}
                  note={note}
                  onNote={setNote}
                  user={user}
                  pending={pending}
                  onConfirm={confirm}
                  loginHref={loginHref("/login")}
                  registerHref={loginHref("/register")}
                />
              ) : (
                <p className="text-stone">Цагаа сонгоно уу.</p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Захиалгын хураангуй">
          <div className="rounded-[18px] border border-line bg-surface p-6">
            <p className="eyebrow">Захиалгын хураангуй</p>
            <p className="mt-3 text-[15px] font-semibold tracking-wide">{business.name}</p>
            <p className="mt-1 flex items-start gap-1.5 text-[13px] text-stone">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {business.address}
            </p>
            <dl className="mt-5 divide-y divide-line text-[14px]">
              <SummaryRow label="Үйлчилгээ" value={service?.name} />
              <SummaryRow label="Мэргэжилтэн" value={staffId === ANY ? "Хэн ч байсан болно" : chosenStaff?.name} />
              <SummaryRow label="Огноо" value={date ? dayLabel(date) : undefined} />
              <SummaryRow label="Цаг" value={time ?? undefined} />
              <SummaryRow label="Үргэлжлэх хугацаа" value={service ? formatDuration(service.durationMin) : undefined} />
              <SummaryRow label="Үнэ" value={service ? formatMoney(service.price) : undefined} strong />
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-stone">{label}</dt>
      <dd className={cn("text-right tabular", strong ? "text-[16px] font-semibold" : "font-medium", !value && "text-mute")}>{value ?? "Сонгоогүй"}</dd>
    </div>
  );
}

function StepServices({ services, selected, onSelect }: { services: WizardService[]; selected: string | null; onSelect: (id: string) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, WizardService[]>();
    for (const s of services) map.set(s.category, [...(map.get(s.category) ?? []), s]);
    return [...map.entries()];
  }, [services]);
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Үйлчилгээ сонгох</h2>
      {groups.map(([cat, list]) => (
        <section key={cat} aria-label={cat}>
          <h3 className="eyebrow mb-3">{cat}</h3>
          <ul className="space-y-2.5">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-pressed={selected === s.id}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 rounded-[14px] border p-4 text-left transition-colors",
                    selected === s.id ? "border-ink bg-ivory/60" : "border-line bg-surface hover:border-ink/40",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{s.name}</span>
                    <span className="mt-0.5 line-clamp-1 block text-[13px] text-stone">{s.description}</span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-mute">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {formatDuration(s.durationMin)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular">{formatMoney(s.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function StepStaff({ staff, selected, onSelect }: { staff: WizardStaff[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Мэргэжилтэн сонгох</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        <li>
          <button
            type="button"
            onClick={() => onSelect(ANY)}
            aria-pressed={selected === ANY}
            className={cn(
              "flex h-full w-full items-center gap-4 rounded-[14px] border p-4 text-left transition-colors",
              selected === ANY ? "border-ink bg-ivory/60" : "border-line bg-surface hover:border-ink/40",
            )}
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ivory text-stone">
              <Users className="h-6 w-6" aria-hidden />
            </span>
            <span>
              <span className="block font-semibold">Хэн ч байсан болно</span>
              <span className="mt-0.5 block text-[13px] text-stone">Чөлөөтэй мэргэжилтнийг бид оноож өгнө.</span>
            </span>
          </button>
        </li>
        {staff.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              aria-pressed={selected === s.id}
              className={cn(
                "flex h-full w-full items-center gap-4 rounded-[14px] border p-4 text-left transition-colors",
                selected === s.id ? "border-ink bg-ivory/60" : "border-line bg-surface hover:border-ink/40",
              )}
            >
              <Avatar name={s.name} src={s.photoUrl} size={56} />
              <span className="min-w-0">
                <span className="block font-semibold">{s.name}</span>
                <span className="block text-[13px] text-stone">{s.title} · {s.experienceYears} жил</span>
                <Rating value={s.ratingAvg} count={s.reviewCount} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepDate({
  todayKey,
  counts,
  failed,
  selected,
  onSelect,
}: {
  todayKey: string;
  counts: Record<string, number> | null;
  failed: boolean;
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const keys = counts ? Object.keys(counts).sort() : [];
  const first = keys[0] ?? todayKey;
  const lead = keyParts(first).weekday;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...keys];
  const monthLabel = keys.length ? `${keyParts(keys[0]).y} оны ${keyParts(keys[0]).m}-р сар` : "";
  const endMonth = keys.length ? keyParts(keys[keys.length - 1]).m : 0;
  return (
    <div>
      <h2 className="text-xl font-semibold">Огноо сонгох</h2>
      {failed ? (
        <p className="mt-5 rounded-[12px] bg-danger-soft p-4 text-sm text-danger" role="alert">
          Мэдээлэл ачааллахад алдаа гарлаа. Дахин оролдоно уу.
        </p>
      ) : !counts ? (
        <div className="mt-5 grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} className="skeleton aspect-square rounded-[12px]" />
          ))}
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-stone">
            {monthLabel}
            {keys.length && keyParts(keys[0]).m !== endMonth ? ` – ${endMonth}-р сар` : ""}
          </p>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2" role="grid" aria-label="Огноо">
            {WEEKDAYS_SHORT.map((d) => (
              <div key={d} className="pb-1 text-[12px] text-mute" role="columnheader">
                {d}
              </div>
            ))}
            {cells.map((key, i) => {
              if (!key) return <div key={`b${i}`} />;
              const count = counts[key] ?? 0;
              const disabled = count === 0;
              const active = selected === key;
              const p = keyParts(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(key)}
                  aria-pressed={active}
                  aria-label={`${longDayLabel(key)}${disabled ? ", цаг байхгүй" : `, ${count} цаг боломжтой`}`}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-[12px] border text-[15px] transition-colors",
                    active
                      ? "border-ink bg-ink text-paper"
                      : disabled
                        ? "border-transparent text-sand"
                        : "border-line bg-surface hover:border-ink/50",
                    key === todayKey && !active && "ring-1 ring-accent/60",
                  )}
                >
                  <span className="tabular">{p.d}</span>
                  {!disabled ? <span className={cn("mt-0.5 h-1 w-1 rounded-full", active ? "bg-paper" : "bg-success")} /> : null}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[12px] text-mute">Ногоон цэг нь чөлөөтэй цагтай өдрийг заана.</p>
        </>
      )}
    </div>
  );
}

function StepTime({
  slots,
  failed,
  selected,
  onSelect,
  date,
}: {
  slots: Slot[] | null;
  failed: boolean;
  selected: string | null;
  onSelect: (t: string) => void;
  date: string | null;
}) {
  const groups = useMemo(() => {
    const g = { "Өглөө": [] as Slot[], "Өдөр": [] as Slot[], "Орой": [] as Slot[] };
    for (const s of slots ?? []) {
      const h = Number(s.time.slice(0, 2));
      (h < 12 ? g["Өглөө"] : h < 17 ? g["Өдөр"] : g["Орой"]).push(s);
    }
    return Object.entries(g).filter(([, v]) => v.length);
  }, [slots]);

  return (
    <div>
      <h2 className="text-xl font-semibold">Цаг сонгох</h2>
      {date ? <p className="mt-1 text-sm text-stone">{longDayLabel(date)}</p> : null}
      {failed ? (
        <p className="mt-5 rounded-[12px] bg-danger-soft p-4 text-sm text-danger" role="alert">
          Мэдээлэл ачааллахад алдаа гарлаа. Дахин оролдоно уу.
        </p>
      ) : !slots ? (
        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton h-12 rounded-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-5 rounded-[12px] bg-ivory p-5 text-sm text-stone">Энэ өдөр чөлөөтэй цаг алга байна. Өөр өдөр сонгоно уу.</p>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map(([label, list]) => (
            <section key={label} aria-label={label}>
              <h3 className="eyebrow mb-3">{label}</h3>
              <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {list.map((s) => (
                  <li key={s.time}>
                    <button
                      type="button"
                      onClick={() => onSelect(s.time)}
                      aria-pressed={selected === s.time}
                      className={cn(
                        "h-12 w-full rounded-full border text-[15px] font-medium tabular transition-colors",
                        selected === s.time ? "border-ink bg-ink text-paper" : "border-sand bg-surface hover:border-ink",
                      )}
                    >
                      {s.time}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StepConfirm({
  error,
  note,
  onNote,
  user,
  pending,
  onConfirm,
  loginHref,
  registerHref,
}: {
  error: string | null;
  note: string;
  onNote: (v: string) => void;
  user: { name: string } | null;
  pending: boolean;
  onConfirm: () => void;
  loginHref: string;
  registerHref: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold">Захиалгаа баталгаажуулах</h2>
      <p className="mt-2 text-sm text-stone">Мэдээллээ шалгаад баталгаажуулна уу. Төлбөрийг салон дээр төлнө.</p>
      <label className="mt-6 block">
        <span className="mb-1.5 block text-[13px] font-medium">Мэргэжилтэнд үлдээх тэмдэглэл (заавал биш)</span>
        <Textarea value={note} onChange={(e) => onNote(e.target.value)} maxLength={300} placeholder="Жишээ нь: хумсны өнгөний сонголт, онцгой хүсэлт" />
      </label>
      {error ? (
        <p className="mt-4 rounded-[12px] bg-danger-soft p-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {user ? (
        <div className="mt-6">
          <p className="mb-3 text-sm text-stone">Захиалагч: <span className="font-medium text-ink">{user.name}</span></p>
          <Button size="lg" className="w-full sm:w-auto" onClick={onConfirm} loading={pending}>
            Захиалга баталгаажуулах
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-[14px] border border-line bg-ivory/50 p-5">
          <p className="text-sm text-charcoal">Захиалгаа баталгаажуулахын тулд нэвтэрнэ үү. Таны сонголт хадгалагдсан хэвээр үлдэнэ.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={loginHref} className={buttonClass("primary", "md")}>
              Нэвтрэх
            </Link>
            <Link href={registerHref} className={buttonClass("outline", "md")}>
              Бүртгүүлэх
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
