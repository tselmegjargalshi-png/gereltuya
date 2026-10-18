"use client";

import { Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { formatDuration, formatMoney } from "@/lib/format";
import { deleteServiceAction, saveServiceAction, toggleServiceAction } from "@/server/actions/owner-services";

type Row = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  durationMin: number;
  price: number;
  active: boolean;
  staffIds: string[];
  bookings: number;
};

type Draft = { id?: string; name: string; description: string; categoryId: string; durationMin: string; price: string; active: boolean; staffIds: string[] };

export function ServiceManager({
  services,
  categories,
  staff,
  plan,
  limit,
}: {
  services: Row[];
  categories: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  plan: string;
  limit: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [del, setDel] = useState<Row | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, start] = useTransition();

  const atLimit = limit !== null && services.length >= limit;

  const openNew = () => {
    setErrors({});
    setFormError(undefined);
    setDraft({ name: "", description: "", categoryId: categories[0]?.id ?? "", durationMin: "60", price: "", active: true, staffIds: staff.map((s) => s.id) });
  };
  const openEdit = (s: Row) => {
    setErrors({});
    setFormError(undefined);
    setDraft({ id: s.id, name: s.name, description: s.description, categoryId: s.categoryId, durationMin: String(s.durationMin), price: String(s.price), active: s.active, staffIds: s.staffIds });
  };

  const save = () => {
    if (!draft) return;
    setErrors({});
    setFormError(undefined);
    start(async () => {
      const res = await saveServiceAction({ ...draft, durationMin: Number(draft.durationMin), price: Number(draft.price === "" ? NaN : draft.price) });
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.error) setFormError(res.error);
      else {
        toast(draft.id ? "Үйлчилгээ шинэчлэгдлээ." : "Үйлчилгээ нэмэгдлээ.");
        setDraft(null);
        router.refresh();
      }
    });
  };

  const toggle = (s: Row, active: boolean) =>
    start(async () => {
      const res = await toggleServiceAction(s.id, active);
      if (res.error) toast(res.error, "error");
      else {
        toast(active ? "Үйлчилгээ идэвхжлээ." : "Үйлчилгээ түр нуугдлаа.");
        router.refresh();
      }
    });

  const remove = () => {
    if (!del) return;
    start(async () => {
      const res = await deleteServiceAction(del.id);
      if (res.error) toast(res.error, "error");
      else {
        toast(res.data?.archived ? "Захиалгын түүхтэй тул үйлчилгээг нуулаа." : "Үйлчилгээ устгагдлаа.");
        setDel(null);
        router.refresh();
      }
    });
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone">
          {services.length} үйлчилгээ{limit !== null ? `, ${plan} багцад ${limit} хүртэл` : ""}
        </p>
        <Button onClick={openNew} disabled={atLimit}>
          <Plus className="h-4 w-4" aria-hidden />
          Үйлчилгээ нэмэх
        </Button>
      </div>
      {atLimit ? <p className="mb-4 rounded-[12px] bg-warning-soft px-4 py-3 text-sm text-warning">{plan} багцын үйлчилгээний хязгаарт хүрлээ. Тохиргоо хэсгээс багцаа ахиулна уу.</p> : null}

      {services.length === 0 ? (
        <EmptyState icon={<Scissors className="h-8 w-8" aria-hidden />} title="Үйлчилгээ нэмээгүй байна." description="Эхний үйлчилгээгээ нэмснээр үйлчлүүлэгчид захиалах боломжтой болно." action={<Button onClick={openNew}>Үйлчилгээ нэмэх</Button>} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
          {services.map((s) => (
            <li key={s.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-[15px] font-medium ${s.active ? "" : "text-mute"}`}>{s.name}</p>
                  <Badge>{s.categoryName}</Badge>
                  {!s.active ? <Badge tone="warning">Нуугдсан</Badge> : null}
                </div>
                <p className="mt-1 flex flex-wrap gap-x-4 text-[13px] text-stone">
                  <span>{formatDuration(s.durationMin)}</span>
                  <span className="font-medium tabular text-ink">{formatMoney(s.price)}</span>
                  <span>{s.staffIds.length} мэргэжилтэн</span>
                  <span>{s.bookings} захиалга</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={s.active} onChange={(v) => toggle(s, v)} label={`${s.name} идэвхтэй эсэх`} disabled={pending} />
                <Button variant="ghost" size="icon" aria-label={`${s.name} засах`} onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`${s.name} устгах`} onClick={() => setDel(s)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Үйлчилгээ засах" : "Шинэ үйлчилгээ"}
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
            <Field label="Үйлчилгээний нэр" htmlFor="s-name" error={errors.name}>
              <Input id="s-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Жишээ нь: Гелэн маникюр" />
            </Field>
            <Field label="Ангилал" htmlFor="s-cat" error={errors.categoryId}>
              <Select id="s-cat" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Үргэлжлэх хугацаа (минут)" htmlFor="s-dur" error={errors.durationMin}>
                <Input id="s-dur" type="number" inputMode="numeric" min={5} step={5} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} />
              </Field>
              <Field label="Үнэ (₮)" htmlFor="s-price" error={errors.price}>
                <Input id="s-price" type="number" inputMode="numeric" min={0} step={1000} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
              </Field>
            </div>
            <Field label="Тайлбар" htmlFor="s-desc" error={errors.description}>
              <Textarea id="s-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={400} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium">Хэн үзүүлэх вэ</legend>
              {staff.length === 0 ? (
                <p className="text-sm text-stone">Эхлээд мэргэжилтэн нэмнэ үү.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {staff.map((s) => {
                    const on = draft.staffIds.includes(s.id);
                    return (
                      <label key={s.id} className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] ${on ? "border-ink bg-ink text-paper" : "border-sand bg-surface"}`}>
                        <input type="checkbox" className="sr-only" checked={on} onChange={() => setDraft({ ...draft, staffIds: on ? draft.staffIds.filter((x) => x !== s.id) : [...draft.staffIds, s.id] })} />
                        {s.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
            <div className="flex items-center justify-between rounded-[12px] bg-ivory px-4 py-3">
              <span className="text-sm">Захиалга авч байна</span>
              <Switch checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Захиалга авч байна" />
            </div>
            {formError ? <p role="alert" className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">{formError}</p> : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(del)}
        onClose={() => setDel(null)}
        title="Үйлчилгээг устгах уу?"
        description={del?.bookings ? "Захиалгын түүхтэй тул устгахгүй, зөвхөн нууна." : "Энэ үйлдлийг буцаах боломжгүй."}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDel(null)}>
              Болих
            </Button>
            <Button variant="danger" loading={pending} onClick={remove}>
              {del?.bookings ? "Нуух" : "Устгах"}
            </Button>
          </>
        }
      >
        <p className="text-sm">{del?.name}</p>
      </Modal>
    </div>
  );
}
