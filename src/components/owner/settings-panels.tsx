"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Plan } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { PLANS } from "@/lib/plans";
import { formatMoney, WEEKDAYS } from "@/lib/format";
import { changePlanAction, saveBookingRulesAction, saveBusinessHoursAction } from "@/server/actions/owner-business";

type Rule = { minLeadMinutes: number; maxAdvanceDays: number; cancelWindowHours: number; slotStepMin: number; bufferMin: number; autoConfirm: boolean; cancellationPolicy: string };
type Hour = { weekday: number; isClosed: boolean; openTime: string; closeTime: string };

export function SettingsPanels({ rule, hours, plan, trial, periodEnd }: { rule: Rule; hours: Hour[]; plan: Plan; trial: boolean; periodEnd: string | null }) {
  return (
    <div className="space-y-6">
      <RulesPanel initial={rule} />
      <HoursPanel initial={hours} />
      <PlanPanel plan={plan} trial={trial} periodEnd={periodEnd} />
      <section className="rounded-[16px] border border-line bg-surface p-6" aria-labelledby="notif-title">
        <h2 id="notif-title" className="text-[15px] font-semibold">Мэдэгдлийн сувгууд</h2>
        <ul className="mt-4 divide-y divide-line text-sm">
          <li className="flex items-center justify-between py-3">
            <span>Апп доторх мэдэгдэл</span>
            <Badge tone="success">Идэвхтэй</Badge>
          </li>
          <li className="flex items-center justify-between py-3">
            <span>SMS</span>
            <Badge>Удахгүй</Badge>
          </li>
          <li className="flex items-center justify-between py-3">
            <span>И-мэйл</span>
            <Badge>Удахгүй</Badge>
          </li>
          <li className="flex items-center justify-between py-3">
            <span>Push мэдэгдэл</span>
            <Badge>Удахгүй</Badge>
          </li>
        </ul>
      </section>
    </div>
  );
}

function RulesPanel({ initial }: { initial: Rule }) {
  const router = useRouter();
  const toast = useToast();
  const [r, setR] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const num = (k: keyof Rule) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setR({ ...r, [k]: Number(e.target.value) });
  const save = () =>
    start(async () => {
      setErrors({});
      const res = await saveBookingRulesAction(r);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.error) toast(res.error, "error");
      else {
        toast("Захиалгын тохиргоо хадгалагдлаа.");
        router.refresh();
      }
    });
  return (
    <section className="rounded-[16px] border border-line bg-surface p-6" aria-labelledby="rules-title">
      <h2 id="rules-title" className="text-[15px] font-semibold">Захиалгын тохиргоо</h2>
      <div className="mt-5 space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-[12px] bg-ivory px-4 py-3">
          <div>
            <p className="text-sm font-medium">Захиалгыг автоматаар баталгаажуулах</p>
            <p className="text-[13px] text-stone">Унтраавал шинэ захиалга таны баталгаажуулалтыг хүлээнэ.</p>
          </div>
          <Switch checked={r.autoConfirm} onChange={(v) => setR({ ...r, autoConfirm: v })} label="Автоматаар баталгаажуулах" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Хамгийн ойр захиалах хугацаа (минут)" htmlFor="r-lead" error={errors.minLeadMinutes} hint="Одооноос хэдэн минутын дараахаас захиалга авах">
            <Input id="r-lead" type="number" min={0} step={15} value={r.minLeadMinutes} onChange={num("minLeadMinutes")} />
          </Field>
          <Field label="Урьдчилан захиалах дээд хугацаа (өдөр)" htmlFor="r-adv" error={errors.maxAdvanceDays}>
            <Input id="r-adv" type="number" min={1} max={180} value={r.maxAdvanceDays} onChange={num("maxAdvanceDays")} />
          </Field>
          <Field label="Цуцлах, өөрчлөх хугацаа (цаг)" htmlFor="r-cancel" error={errors.cancelWindowHours} hint="Захиалга эхлэхээс өмнөх энэ хугацаанд үйлчлүүлэгч өөрөө цуцлах боломжгүй">
            <Input id="r-cancel" type="number" min={0} max={168} value={r.cancelWindowHours} onChange={num("cancelWindowHours")} />
          </Field>
          <Field label="Цагийн алхам" htmlFor="r-step" error={errors.slotStepMin}>
            <Select id="r-step" value={r.slotStepMin} onChange={num("slotStepMin")}>
              {[15, 20, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m} минут
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Үйлчилгээ хоорондын завсар (минут)" htmlFor="r-buf" error={errors.bufferMin}>
            <Input id="r-buf" type="number" min={0} max={120} step={5} value={r.bufferMin} onChange={num("bufferMin")} />
          </Field>
        </div>
        <Field label="Цуцлалтын нөхцөл" htmlFor="r-policy" error={errors.cancellationPolicy} hint="Захиалгын хуудсанд үйлчлүүлэгчид харагдана.">
          <Textarea id="r-policy" value={r.cancellationPolicy} onChange={(e) => setR({ ...r, cancellationPolicy: e.target.value })} maxLength={600} />
        </Field>
        <Button onClick={save} loading={pending} disabled={JSON.stringify(r) === JSON.stringify(initial)}>
          Хадгалах
        </Button>
      </div>
    </section>
  );
}

function HoursPanel({ initial }: { initial: Hour[] }) {
  const router = useRouter();
  const toast = useToast();
  const [days, setDays] = useState(initial);
  const [pending, start] = useTransition();
  const patch = (i: number, p: Partial<Hour>) => setDays(days.map((d, k) => (k === i ? { ...d, ...p } : d)));
  const save = () =>
    start(async () => {
      const res = await saveBusinessHoursAction(days);
      if (res.error) toast(res.error, "error");
      else {
        toast("Ажлын цаг хадгалагдлаа.");
        router.refresh();
      }
    });
  return (
    <section className="rounded-[16px] border border-line bg-surface p-6" aria-labelledby="hours-title">
      <h2 id="hours-title" className="text-[15px] font-semibold">Бизнесийн ажлын цаг</h2>
      <p className="mt-1 text-[13px] text-stone">Мэргэжилтэн тусдаа хуваарьгүй бол энэ цагаар ажиллана.</p>
      <ul className="mt-4 space-y-2">
        {days.map((d, i) => (
          <li key={d.weekday} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-line px-4 py-3">
            <span className="w-20 text-sm font-medium">{WEEKDAYS[d.weekday]}</span>
            <Switch checked={!d.isClosed} onChange={(v) => patch(i, { isClosed: !v })} label={`${WEEKDAYS[d.weekday]} нээлттэй`} />
            {d.isClosed ? (
              <span className="text-[13px] text-mute">Амарна</span>
            ) : (
              <span className="flex items-center gap-2">
                <Input type="time" step={900} aria-label="Нээх цаг" value={d.openTime} onChange={(e) => patch(i, { openTime: e.target.value })} className="h-10 w-32 text-[14px]" />
                <span className="text-mute">-</span>
                <Input type="time" step={900} aria-label="Хаах цаг" value={d.closeTime} onChange={(e) => patch(i, { closeTime: e.target.value })} className="h-10 w-32 text-[14px]" />
              </span>
            )}
          </li>
        ))}
      </ul>
      <Button className="mt-5" onClick={save} loading={pending} disabled={JSON.stringify(days) === JSON.stringify(initial)}>
        Хадгалах
      </Button>
    </section>
  );
}

function PlanPanel({ plan, trial, periodEnd }: { plan: Plan; trial: boolean; periodEnd: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<Plan | null>(null);
  const [pending, start] = useTransition();
  const choose = (p: Plan) => {
    setBusy(p);
    start(async () => {
      const res = await changePlanAction(p);
      setBusy(null);
      if (res.error) toast(res.error, "error");
      else {
        toast(res.data?.demo ? `${p} багц сонгогдлоо. Туршилтын горим, жинхэнэ төлбөр хийгдээгүй.` : `${p} багц идэвхжлээ.`);
        router.refresh();
      }
    });
  };
  return (
    <section id="bagts" className="scroll-mt-24 rounded-[16px] border border-line bg-surface p-6" aria-labelledby="plan-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="plan-title" className="text-[15px] font-semibold">Багц</h2>
        <p className="text-[13px] text-stone">
          Одоогийн багц: <span className="font-semibold text-ink">{plan}</span>
          {trial ? " (туршилт)" : ""}
          {periodEnd ? `, ${periodEnd} хүртэл` : ""}
        </p>
      </div>
      <ul className="mt-5 grid gap-4 md:grid-cols-3">
        {(Object.keys(PLANS) as Plan[]).map((id) => {
          const def = PLANS[id];
          const current = id === plan;
          return (
            <li key={id} className={`flex flex-col rounded-[14px] border p-5 ${current ? "border-ink" : "border-line"}`}>
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-semibold">{def.name}</p>
                {current ? <Badge tone="dark">Одоогийн</Badge> : null}
              </div>
              <p className="mt-2 text-[1.4rem] font-semibold tabular">
                {def.price === 0 ? "Үнэгүй" : formatMoney(def.price)}
                {def.price ? <span className="text-[13px] font-normal text-stone"> / сар</span> : null}
              </p>
              <p className="mt-2 text-[13px] text-stone">{def.description}</p>
              <ul className="mt-4 flex-1 space-y-2 text-[13px]">
                {def.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-5" variant={current ? "secondary" : "primary"} size="sm" disabled={current || pending} loading={busy === id} onClick={() => choose(id)}>
                {current ? "Сонгосон" : "Сонгох"}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12.5px] text-mute">Багц солих нь туршилтын горимд ажиллана. Төлбөрийн үйлчилгээ холбогдсоны дараа жинхэнэ нэхэмжлэх үүснэ.</p>
    </section>
  );
}
