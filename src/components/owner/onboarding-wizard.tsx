"use client";

import { Check, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { ImageField } from "@/components/owner/image-field";
import { useToast } from "@/components/ui/toast";
import { DISTRICTS } from "@/lib/districts";
import { formatDuration, formatMoney, WEEKDAYS } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  finishOnboardingAction,
  saveBookingRulesAction,
  saveBusinessHoursAction,
  saveOnboardingInfoAction,
  setOnboardingStepAction,
} from "@/server/actions/owner-business";
import { deleteServiceAction, saveServiceAction } from "@/server/actions/owner-services";
import { deleteStaffAction, saveStaffAction } from "@/server/actions/owner-staff";

const STEPS = ["Бүртгэл", "Бизнесийн мэдээлэл", "Үйлчилгээ", "Мэргэжилтэн", "Ажлын цаг", "Захиалгын тохиргоо", "Бэлэн боллоо"];

type Info = { name: string; tagline: string; address: string; district: string; phone: string; description: string; categoryIds: string[] };
type Hour = { weekday: number; isClosed: boolean; openTime: string; closeTime: string };
type Rule = { minLeadMinutes: number; maxAdvanceDays: number; cancelWindowHours: number; slotStepMin: number; bufferMin: number; autoConfirm: boolean; cancellationPolicy: string };

export function OnboardingWizard(props: {
  userName: string;
  initialStep: number;
  categories: { id: string; name: string }[];
  services: { id: string; name: string; durationMin: number; price: number }[];
  staff: { id: string; name: string; title: string }[];
  info: Info;
  hours: Hour[];
  rule: Rule;
  canUpload: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(props.initialStep);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const goto = (n: number) => {
    setError(undefined);
    setStep(n);
    start(async () => {
      await setOnboardingStepAction(n);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex items-center gap-1.5" aria-label="Явц">
        {STEPS.map((label, i) => {
          const n = i + 1;
          return (
            <li key={label} className="flex flex-1 flex-col gap-2" aria-current={n === step ? "step" : undefined}>
              <span className={cn("h-1 rounded-full transition-colors", n <= step ? "bg-ink" : "bg-sand")} />
              <span className={cn("hidden text-[11px] sm:block", n === step ? "font-semibold text-ink" : "text-mute")}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mb-1 text-[13px] text-stone sm:hidden">
        {step}/7 · {STEPS[step - 1]}
      </p>

      {step === 1 || step === 2 ? <StepInfo {...props} onDone={() => goto(3)} setError={setError} /> : null}
      {step === 3 ? <StepServices {...props} onBack={() => goto(2)} onNext={() => goto(4)} /> : null}
      {step === 4 ? <StepStaff {...props} onBack={() => goto(3)} onNext={() => goto(5)} /> : null}
      {step === 5 ? <StepHours initial={props.hours} onBack={() => goto(4)} onNext={() => goto(6)} /> : null}
      {step === 6 ? <StepRules initial={props.rule} onBack={() => goto(5)} onNext={() => goto(7)} /> : null}
      {step === 7 ? (
        <section aria-labelledby="done-title" className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <h1 id="done-title" className="mt-6 font-display text-[2.2rem] leading-tight">
            Таны бизнес захиалга авахад бэлэн боллоо.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-stone">
            {props.services.length} үйлчилгээ, {props.staff.length} мэргэжилтэн, ажлын цаг тохирсон байна. Самбар руу орж эхний захиалгаа хүлээн авна уу.
          </p>
          {error ? <p role="alert" className="mx-auto mt-6 max-w-md rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="ghost" onClick={() => goto(6)}>
              Буцах
            </Button>
            <Button
              size="lg"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await finishOnboardingAction();
                  if (res?.error) setError(res.error);
                  else router.push("/owner?welcome=1");
                })
              }
            >
              Самбар руу очих
            </Button>
          </div>
        </section>
      ) : null}
      {error && step !== 7 ? <p className="sr-only" role="alert">{error}</p> : null}
    </div>
  );
}

function Shell({ title, lead, children, footer }: { title: string; lead: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <section aria-labelledby="step-title">
      <h1 id="step-title" className="font-display text-[2rem] leading-tight md:text-[2.4rem]">
        {title}
      </h1>
      <p className="mt-2 text-stone">{lead}</p>
      <div className="mt-8 space-y-5">{children}</div>
      <div className="mt-8 flex items-center justify-between gap-3">{footer}</div>
    </section>
  );
}

function StepInfo({ info, categories, userName, onDone }: { info: Info; categories: { id: string; name: string }[]; userName: string; onDone: () => void; setError: (e?: string) => void }) {
  const [s, setS] = useState<Info>({ ...info, name: info.name.endsWith(" салон") ? "" : info.name });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof Info>(k: K, v: Info[K]) => setS((p) => ({ ...p, [k]: v }));
  const submit = () =>
    start(async () => {
      setErrors({});
      const res = await saveOnboardingInfoAction(s);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.ok) onDone();
    });
  return (
    <Shell
      title="Бизнесийнхээ тухай"
      lead={`${userName}, бүртгэл амжилттай үүслээ. Одоо бизнесийнхээ мэдээллийг оруулна уу.`}
      footer={
        <>
          <span />
          <Button size="lg" loading={pending} onClick={submit}>
            Үргэлжлүүлэх
          </Button>
        </>
      }
    >
      <Field label="Бизнесийн нэр" htmlFor="o-name" error={errors.name}>
        <Input id="o-name" value={s.name} onChange={(e) => set("name", e.target.value)} placeholder="Жишээ нь: Нарлаг студи" />
      </Field>
      <Field label="Богино тайлбар" htmlFor="o-tag" error={errors.tagline}>
        <Input id="o-tag" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={90} />
      </Field>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Ангилал</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const on = s.categoryIds.includes(c.id);
            return (
              <label key={c.id} className={cn("cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px]", on ? "border-ink bg-ink text-paper" : "border-sand bg-surface")}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => set("categoryIds", on ? s.categoryIds.filter((x) => x !== c.id) : [...s.categoryIds, c.id])} />
                {c.name}
              </label>
            );
          })}
        </div>
        {errors.categoryIds ? <p className="mt-1.5 text-[13px] text-danger" role="alert">{errors.categoryIds}</p> : null}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Дүүрэг" htmlFor="o-district" error={errors.district}>
          <Select id="o-district" value={s.district} onChange={(e) => set("district", e.target.value)}>
            <option value="">Сонгоно уу</option>
            {DISTRICTS.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Утас" htmlFor="o-phone" error={errors.phone}>
          <Input id="o-phone" inputMode="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9911 2233" />
        </Field>
      </div>
      <Field label="Хаяг" htmlFor="o-address" error={errors.address}>
        <Input id="o-address" value={s.address} onChange={(e) => set("address", e.target.value)} placeholder="Дүүрэг, хороо, байр, тоот" />
      </Field>
      <Field label="Танилцуулга" htmlFor="o-desc" error={errors.description}>
        <Textarea id="o-desc" value={s.description} onChange={(e) => set("description", e.target.value)} maxLength={1200} />
      </Field>
    </Shell>
  );
}

function StepServices({ services, categories, info, onBack, onNext }: { services: { id: string; name: string; durationMin: number; price: number }[]; categories: { id: string; name: string }[]; info: Info; onBack: () => void; onNext: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const first = categories.find((c) => info.categoryIds.includes(c.id)) ?? categories[0];
  const [d, setD] = useState({ name: "", categoryId: first?.id ?? "", durationMin: "60", price: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();
  const add = () =>
    start(async () => {
      setErrors({});
      setFormError(undefined);
      const res = await saveServiceAction({ name: d.name, categoryId: d.categoryId, durationMin: Number(d.durationMin), price: d.price === "" ? NaN : Number(d.price), description: "", active: true, staffIds: [] });
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.error) setFormError(res.error);
      else {
        setD({ ...d, name: "", price: "" });
        toast("Үйлчилгээ нэмэгдлээ.");
        router.refresh();
      }
    });
  const remove = (id: string) =>
    start(async () => {
      const res = await deleteServiceAction(id);
      if (res.error) toast(res.error, "error");
      else router.refresh();
    });
  return (
    <Shell
      title="Үйлчилгээгээ нэмнэ үү"
      lead="Хамгийн багадаа нэг үйлчилгээ шаардлагатай. Дараа нь самбараас нэмж, засаж болно."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Буцах
          </Button>
          <Button size="lg" disabled={services.length === 0} onClick={onNext}>
            Үргэлжлүүлэх
          </Button>
        </>
      }
    >
      {services.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
          {services.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 truncate font-medium">{s.name}</span>
              <span className="shrink-0 text-stone">{formatDuration(s.durationMin)} · <span className="tabular text-ink">{formatMoney(s.price)}</span></span>
              <button type="button" aria-label={`${s.name} устгах`} onClick={() => remove(s.id)} className="text-mute hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-4 rounded-[14px] bg-ivory/70 p-5">
        <Field label="Үйлчилгээний нэр" htmlFor="os-name" error={errors.name}>
          <Input id="os-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Жишээ нь: Гелэн маникюр" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ангилал" htmlFor="os-cat" error={errors.categoryId}>
            <Select id="os-cat" value={d.categoryId} onChange={(e) => setD({ ...d, categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Хугацаа (минут)" htmlFor="os-dur" error={errors.durationMin}>
            <Input id="os-dur" type="number" min={5} step={5} value={d.durationMin} onChange={(e) => setD({ ...d, durationMin: e.target.value })} />
          </Field>
          <Field label="Үнэ (₮)" htmlFor="os-price" error={errors.price}>
            <Input id="os-price" type="number" min={0} step={1000} value={d.price} onChange={(e) => setD({ ...d, price: e.target.value })} />
          </Field>
        </div>
        {formError ? <p role="alert" className="text-sm text-danger">{formError}</p> : null}
        <Button variant="secondary" loading={pending} onClick={add}>
          Үйлчилгээ нэмэх
        </Button>
      </div>
    </Shell>
  );
}

function StepStaff({ staff, services, canUpload, onBack, onNext }: { staff: { id: string; name: string; title: string }[]; services: { id: string }[]; canUpload: boolean; onBack: () => void; onNext: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState({ name: "", title: "", photoUrl: "", experienceYears: "1" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();
  const add = () =>
    start(async () => {
      setErrors({});
      setFormError(undefined);
      const res = await saveStaffAction({ ...d, experienceYears: Number(d.experienceYears), bio: "", active: true, serviceIds: services.map((s) => s.id), loginEmail: "", loginPassword: "" });
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.error) setFormError(res.error);
      else {
        setD({ name: "", title: "", photoUrl: "", experienceYears: "1" });
        toast("Мэргэжилтэн нэмэгдлээ.");
        router.refresh();
      }
    });
  const remove = (id: string) =>
    start(async () => {
      const res = await deleteStaffAction(id);
      if (res.error) toast(res.error, "error");
      else router.refresh();
    });
  return (
    <Shell
      title="Багаа танилцуулна уу"
      lead="Ганцаараа ажилладаг бол өөрийгөө мэргэжилтнээр нэмнэ үү. Нэмсэн мэргэжилтэн бүх үйлчилгээг үзүүлнэ, дараа нь самбараас өөрчилж болно."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Буцах
          </Button>
          <Button size="lg" disabled={staff.length === 0} onClick={onNext}>
            Үргэлжлүүлэх
          </Button>
        </>
      }
    >
      {staff.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{s.name}</span>
              <span className="min-w-0 flex-1 truncate text-stone">{s.title}</span>
              <button type="button" aria-label={`${s.name} хасах`} onClick={() => remove(s.id)} className="text-mute hover:text-danger">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-4 rounded-[14px] bg-ivory/70 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Нэр" htmlFor="ot-name" error={errors.name}>
            <Input id="ot-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
          </Field>
          <Field label="Мэргэжил" htmlFor="ot-title" error={errors.title}>
            <Input id="ot-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Жишээ нь: Маникюрын мастер" />
          </Field>
        </div>
        <Field label="Туршлага (жил)" htmlFor="ot-exp" error={errors.experienceYears}>
          <Input id="ot-exp" type="number" min={0} value={d.experienceYears} onChange={(e) => setD({ ...d, experienceYears: e.target.value })} />
        </Field>
        <Field label="Зураг (заавал биш)" htmlFor="ot-photo" error={errors.photoUrl}>
          <ImageField id="ot-photo" name={d.name} value={d.photoUrl} onChange={(v) => setD({ ...d, photoUrl: v })} canUpload={canUpload} />
        </Field>
        {formError ? <p role="alert" className="text-sm text-danger">{formError}</p> : null}
        <Button variant="secondary" loading={pending} onClick={add}>
          Мэргэжилтэн нэмэх
        </Button>
      </div>
    </Shell>
  );
}

function StepHours({ initial, onBack, onNext }: { initial: Hour[]; onBack: () => void; onNext: () => void }) {
  const [days, setDays] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const patch = (i: number, p: Partial<Hour>) => setDays(days.map((d, k) => (k === i ? { ...d, ...p } : d)));
  const submit = () =>
    start(async () => {
      setError(undefined);
      const res = await saveBusinessHoursAction(days);
      if (res.error) setError(res.error);
      else onNext();
    });
  return (
    <Shell
      title="Ажлын цаг"
      lead="Үйлчлүүлэгчид зөвхөн эдгээр цагт захиалга өгч чадна."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Буцах
          </Button>
          <Button size="lg" loading={pending} onClick={submit}>
            Үргэлжлүүлэх
          </Button>
        </>
      }
    >
      <ul className="space-y-2">
        {days.map((d, i) => (
          <li key={d.weekday} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-line bg-surface px-4 py-3">
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
      {error ? <p role="alert" className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
    </Shell>
  );
}

function StepRules({ initial, onBack, onNext }: { initial: Rule; onBack: () => void; onNext: () => void }) {
  const [r, setR] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const num = (k: keyof Rule) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setR({ ...r, [k]: Number(e.target.value) });
  const submit = () =>
    start(async () => {
      setErrors({});
      const res = await saveBookingRulesAction(r);
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.ok) onNext();
    });
  return (
    <Shell
      title="Захиалгын тохиргоо"
      lead="Эдгээрийг дараа нь Тохиргоо хэсгээс өөрчилж болно."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            Буцах
          </Button>
          <Button size="lg" loading={pending} onClick={submit}>
            Үргэлжлүүлэх
          </Button>
        </>
      }
    >
      <div className="flex items-center justify-between gap-4 rounded-[12px] bg-ivory px-4 py-3">
        <div>
          <p className="text-sm font-medium">Захиалгыг автоматаар баталгаажуулах</p>
          <p className="text-[13px] text-stone">Унтраавал шинэ захиалга таны баталгаажуулалтыг хүлээнэ.</p>
        </div>
        <Switch checked={r.autoConfirm} onChange={(v) => setR({ ...r, autoConfirm: v })} label="Автоматаар баталгаажуулах" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Цагийн алхам" htmlFor="or-step" error={errors.slotStepMin}>
          <Select id="or-step" value={r.slotStepMin} onChange={num("slotStepMin")}>
            {[15, 20, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} минут
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Урьдчилан захиалах дээд хугацаа (өдөр)" htmlFor="or-adv" error={errors.maxAdvanceDays}>
          <Input id="or-adv" type="number" min={1} max={180} value={r.maxAdvanceDays} onChange={num("maxAdvanceDays")} />
        </Field>
        <Field label="Хамгийн ойр захиалах хугацаа (минут)" htmlFor="or-lead" error={errors.minLeadMinutes}>
          <Input id="or-lead" type="number" min={0} step={15} value={r.minLeadMinutes} onChange={num("minLeadMinutes")} />
        </Field>
        <Field label="Цуцлах хугацаа (цаг)" htmlFor="or-cancel" error={errors.cancelWindowHours}>
          <Input id="or-cancel" type="number" min={0} max={168} value={r.cancelWindowHours} onChange={num("cancelWindowHours")} />
        </Field>
      </div>
    </Shell>
  );
}
