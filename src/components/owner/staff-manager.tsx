"use client";

import { CalendarClock, Pencil, Plus, Star, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ImageField } from "@/components/owner/image-field";
import { formatMoney, formatRating, WEEKDAYS } from "@/lib/format";
import { deleteStaffAction, saveStaffAction, saveStaffScheduleAction } from "@/server/actions/owner-staff";

type Hour = { weekday: number; isClosed: boolean; openTime: string; closeTime: string; breakStart?: string; breakEnd?: string };
type Row = {
  id: string;
  name: string;
  title: string;
  photoUrl: string;
  bio: string;
  experienceYears: number;
  active: boolean;
  color: string;
  rating: number;
  reviewCount: number;
  serviceIds: string[];
  loginEmail: string;
  hours: (Hour & { breakStart: string; breakEnd: string })[];
  stats: { bookings: number; completed: number; revenue: number };
};
type Draft = { id?: string; name: string; title: string; photoUrl: string; bio: string; experienceYears: string; active: boolean; serviceIds: string[]; loginEmail: string; loginPassword: string };

export function StaffManager({
  staff,
  services,
  businessHours,
  plan,
  limit,
  canUpload,
}: {
  staff: Row[];
  services: { id: string; name: string }[];
  businessHours: Hour[];
  plan: string;
  limit: number | null;
  canUpload: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [del, setDel] = useState<Row | null>(null);
  const [sched, setSched] = useState<Row | null>(null);
  const [pending, start] = useTransition();
  const activeCount = staff.filter((s) => s.active).length;
  const atLimit = limit !== null && activeCount >= limit;

  const open = (s?: Row) => {
    setErrors({});
    setFormError(undefined);
    setDraft(
      s
        ? { id: s.id, name: s.name, title: s.title, photoUrl: s.photoUrl, bio: s.bio, experienceYears: String(s.experienceYears), active: s.active, serviceIds: s.serviceIds, loginEmail: s.loginEmail, loginPassword: "" }
        : { name: "", title: "", photoUrl: "", bio: "", experienceYears: "0", active: true, serviceIds: services.map((x) => x.id), loginEmail: "", loginPassword: "" },
    );
  };

  const save = () => {
    if (!draft) return;
    setErrors({});
    setFormError(undefined);
    start(async () => {
      const res = await saveStaffAction({ ...draft, experienceYears: Number(draft.experienceYears) });
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.error) setFormError(res.error);
      else {
        toast(draft.id ? "Мэргэжилтний мэдээлэл шинэчлэгдлээ." : "Мэргэжилтэн нэмэгдлээ.");
        setDraft(null);
        router.refresh();
      }
    });
  };

  const remove = () => {
    if (!del) return;
    start(async () => {
      const res = await deleteStaffAction(del.id);
      if (res.error) toast(res.error, "error");
      else {
        toast("Мэргэжилтэн хасагдлаа.");
        setDel(null);
        router.refresh();
      }
    });
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone">
          {activeCount} идэвхтэй мэргэжилтэн{limit !== null ? `, ${plan} багцад ${limit} хүртэл` : ""}
        </p>
        <Button onClick={() => open()} disabled={atLimit}>
          <Plus className="h-4 w-4" aria-hidden />
          Мэргэжилтэн нэмэх
        </Button>
      </div>
      {atLimit ? <p className="mb-4 rounded-[12px] bg-warning-soft px-4 py-3 text-sm text-warning">{plan} багцын мэргэжилтний хязгаарт хүрлээ. Тохиргоо хэсгээс багцаа ахиулна уу.</p> : null}

      {staff.length === 0 ? (
        <EmptyState icon={<UserRound className="h-8 w-8" aria-hidden />} title="Мэргэжилтэн нэмээгүй байна." description="Мэргэжилтэн нэмж, ажлын хуваарийг нь тохируулснаар цаг захиалах боломжтой болно." action={<Button onClick={() => open()}>Мэргэжилтэн нэмэх</Button>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {staff.map((s) => (
            <li key={s.id} className={`rounded-[16px] border border-line bg-surface p-5 ${s.active ? "" : "opacity-70"}`}>
              <div className="flex items-start gap-4">
                <Avatar name={s.name} src={s.photoUrl || null} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[16px] font-semibold">{s.name}</p>
                    {!s.active ? <Badge tone="warning">Идэвхгүй</Badge> : null}
                    {s.loginEmail ? <Badge>Нэвтрэх эрхтэй</Badge> : null}
                  </div>
                  <p className="text-[13px] text-stone">
                    {s.title}, {s.experienceYears} жилийн туршлага
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[13px] text-stone">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden />
                    {s.reviewCount ? `${formatRating(s.rating)} (${s.reviewCount})` : "Үнэлгээ байхгүй"}
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 rounded-[12px] bg-ivory/70 p-3 text-center">
                <div>
                  <dt className="text-[11px] text-mute">30 хоногт</dt>
                  <dd className="text-[15px] font-semibold tabular">{s.stats.bookings}</dd>
                  <dd className="text-[11px] text-mute">захиалга</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-mute">Дууссан</dt>
                  <dd className="text-[15px] font-semibold tabular">{s.stats.completed}</dd>
                  <dd className="text-[11px] text-mute">үйлчилгээ</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-mute">Орлого</dt>
                  <dd className="text-[15px] font-semibold tabular">{formatMoney(s.stats.revenue)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[13px] text-stone">{s.serviceIds.length} үйлчилгээ үзүүлнэ</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setSched(s)}>
                  <CalendarClock className="h-4 w-4" aria-hidden />
                  Ажлын цаг
                </Button>
                <Button size="sm" variant="outline" onClick={() => open(s)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Засах
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDel(s)} aria-label={`${s.name} хасах`}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Мэргэжилтэн засах" : "Шинэ мэргэжилтэн"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Болих
            </Button>
            <Button loading={pending} onClick={save}>
              Хадгалах
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Нэр" htmlFor="m-name" error={errors.name}>
                <Input id="m-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Мэргэжил" htmlFor="m-title" error={errors.title}>
                <Input id="m-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Жишээ нь: Ахлах стилист" />
              </Field>
            </div>
            <Field label="Зураг" htmlFor="m-photo" error={errors.photoUrl} hint={canUpload ? undefined : "Зургийн холбоос оруулна уу."}>
              <ImageField id="m-photo" name={draft.name} value={draft.photoUrl} onChange={(v) => setDraft({ ...draft, photoUrl: v })} canUpload={canUpload} />
            </Field>
            <Field label="Туршлага (жил)" htmlFor="m-exp" error={errors.experienceYears}>
              <Input id="m-exp" type="number" min={0} value={draft.experienceYears} onChange={(e) => setDraft({ ...draft, experienceYears: e.target.value })} />
            </Field>
            <Field label="Танилцуулга" htmlFor="m-bio" error={errors.bio}>
              <Textarea id="m-bio" value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} maxLength={500} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium">Үзүүлэх үйлчилгээ</legend>
              {services.length === 0 ? (
                <p className="text-sm text-stone">Эхлээд үйлчилгээ нэмнэ үү.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => {
                    const on = draft.serviceIds.includes(s.id);
                    return (
                      <label key={s.id} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] ${on ? "border-ink bg-ink text-paper" : "border-sand bg-surface"}`}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={() => setDraft({ ...draft, serviceIds: on ? draft.serviceIds.filter((x) => x !== s.id) : [...draft.serviceIds, s.id] })} />
                        {s.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
            <div className="space-y-3 rounded-[14px] bg-ivory/70 p-4">
              <p className="text-[13px] font-medium">Нэвтрэх эрх (заавал биш)</p>
              <p className="text-[12.5px] text-stone">Мэргэжилтэн өөрийн хуваарь, захиалгаа харах боломжтой болно.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="И-мэйл" htmlFor="m-email" error={errors.loginEmail}>
                  <Input id="m-email" type="email" autoComplete="off" value={draft.loginEmail} onChange={(e) => setDraft({ ...draft, loginEmail: e.target.value })} />
                </Field>
                <Field label={draft.id && draft.loginEmail ? "Шинэ нууц үг" : "Нууц үг"} htmlFor="m-pass" error={errors.loginPassword}>
                  <Input id="m-pass" type="password" autoComplete="new-password" value={draft.loginPassword} onChange={(e) => setDraft({ ...draft, loginPassword: e.target.value })} />
                </Field>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[12px] bg-ivory px-4 py-3">
              <span className="text-sm">Захиалга авч байна</span>
              <Switch checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Захиалга авч байна" />
            </div>
            {formError ? <p role="alert" className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">{formError}</p> : null}
          </div>
        ) : null}
      </Modal>

      {sched ? <ScheduleModal key={sched.id} staff={sched} fallback={businessHours} onClose={() => setSched(null)} onSaved={() => { setSched(null); router.refresh(); }} /> : null}

      <Modal
        open={Boolean(del)}
        onClose={() => setDel(null)}
        title="Мэргэжилтнийг хасах уу?"
        description="Захиалгын түүхтэй бол идэвхгүй болгоно, түүхгүй бол бүр мөсөн устгана."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDel(null)}>
              Болих
            </Button>
            <Button variant="danger" loading={pending} onClick={remove}>
              Хасах
            </Button>
          </>
        }
      >
        <p className="text-sm">{del?.name}</p>
      </Modal>
    </div>
  );
}

function ScheduleModal({ staff, fallback, onClose, onSaved }: { staff: Row; fallback: Hour[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const initial = Array.from({ length: 7 }, (_, weekday) => {
    const own = staff.hours.find((h) => h.weekday === weekday);
    const biz = fallback.find((h) => h.weekday === weekday);
    return own ?? { weekday, isClosed: biz?.isClosed ?? weekday === 6, openTime: biz?.openTime ?? "10:00", closeTime: biz?.closeTime ?? "20:00", breakStart: "", breakEnd: "" };
  });
  const [days, setDays] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const patch = (i: number, p: Partial<(typeof days)[number]>) => setDays(days.map((d, k) => (k === i ? { ...d, ...p } : d)));

  const submit = () =>
    start(async () => {
      setError(undefined);
      const res = await saveStaffScheduleAction({ staffId: staff.id, days: days.map((d) => ({ ...d, breakStart: d.breakStart ?? "", breakEnd: d.breakEnd ?? "" })) });
      if (res.error) setError(res.error);
      else {
        toast("Ажлын хуваарь хадгалагдлаа.");
        onSaved();
      }
    });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`${staff.name}, ажлын цаг`}
      description="Амралтын өдрийг унтрааж, завсарлагын цагийг заана."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Болих
          </Button>
          <Button loading={pending} onClick={submit}>
            Хадгалах
          </Button>
        </>
      }
    >
      <ul className="space-y-3">
        {days.map((d, i) => (
          <li key={d.weekday} className="grid gap-2 rounded-[12px] border border-line p-3 sm:grid-cols-[110px_1fr] sm:items-center">
            <div className="flex items-center justify-between sm:block">
              <p className="text-[14px] font-medium">{WEEKDAYS[d.weekday]}</p>
              <div className="sm:mt-1.5">
                <Switch checked={!d.isClosed} onChange={(v) => patch(i, { isClosed: !v })} label={`${WEEKDAYS[d.weekday]} ажиллана`} />
              </div>
            </div>
            {d.isClosed ? (
              <p className="text-[13px] text-mute">Амарна</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-[12px] text-mute">
                  Эхлэх
                  <Input type="time" step={900} value={d.openTime} onChange={(e) => patch(i, { openTime: e.target.value })} className="mt-1 h-10 text-[14px]" />
                </label>
                <label className="text-[12px] text-mute">
                  Дуусах
                  <Input type="time" step={900} value={d.closeTime} onChange={(e) => patch(i, { closeTime: e.target.value })} className="mt-1 h-10 text-[14px]" />
                </label>
                <label className="text-[12px] text-mute">
                  Завсарлага эхлэх
                  <Input type="time" step={900} value={d.breakStart ?? ""} onChange={(e) => patch(i, { breakStart: e.target.value })} className="mt-1 h-10 text-[14px]" />
                </label>
                <label className="text-[12px] text-mute">
                  Завсарлага дуусах
                  <Input type="time" step={900} value={d.breakEnd ?? ""} onChange={(e) => patch(i, { breakEnd: e.target.value })} className="mt-1 h-10 text-[14px]" />
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error ? <p role="alert" className="mt-4 rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
    </Modal>
  );
}
