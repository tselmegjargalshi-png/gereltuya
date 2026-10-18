"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BusinessStatus, ReviewStatus, UserStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/lib/validation";
import {
  deleteCategoryAction,
  saveCategoryAction,
  setBusinessStatusAction,
  setPlatformSettingAction,
  setReviewStatusAction,
  setUserStatusAction,
} from "@/server/actions/admin";

function useRun() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionState>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (res.error) toast(res.error, "error");
      else {
        toast(ok);
        router.refresh();
      }
    });
  return { run, pending };
}

export function BusinessStatusButtons({ id, status }: { id: string; status: BusinessStatus }) {
  const { run, pending } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "ACTIVE" ? (
        <Button size="sm" variant="accent" disabled={pending} onClick={() => run(() => setBusinessStatusAction(id, "ACTIVE"), "Бизнес баталгаажлаа.")}>
          {status === "PENDING" ? "Батлах" : "Сэргээх"}
        </Button>
      ) : null}
      {status !== "SUSPENDED" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setBusinessStatusAction(id, "SUSPENDED"), "Бизнес түр хаагдлаа.")}>
          Түр хаах
        </Button>
      ) : null}
    </div>
  );
}

export function UserStatusButton({ id, status }: { id: string; status: UserStatus }) {
  const { run, pending } = useRun();
  const next: UserStatus = status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setUserStatusAction(id, next), next === "ACTIVE" ? "Хэрэглэгч сэргээгдлээ." : "Хэрэглэгч түр хаагдлаа.")}>
      {status === "ACTIVE" ? "Түр хаах" : "Сэргээх"}
    </Button>
  );
}

export function ReviewButtons({ id, status }: { id: string; status: ReviewStatus }) {
  const { run, pending } = useRun();
  const set = (s: ReviewStatus, msg: string) => run(() => setReviewStatusAction(id, s), msg);
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "VISIBLE" ? (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => set("VISIBLE", "Үнэлгээ харагдаж эхэллээ.")}>
          Харуулах
        </Button>
      ) : null}
      {status !== "HIDDEN" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("HIDDEN", "Үнэлгээ нуугдлаа.")}>
          Нуух
        </Button>
      ) : null}
      {status === "VISIBLE" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => set("FLAGGED", "Үнэлгээ шалгах жагсаалтад орлоо.")}>
          Шалгах
        </Button>
      ) : null}
    </div>
  );
}

export function SettingSwitch({ settingKey, value, label, description }: { settingKey: string; value: boolean; label: string; description: string }) {
  const { run, pending } = useRun();
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[13px] text-stone">{description}</p>
      </div>
      <Switch checked={value} disabled={pending} label={label} onChange={(v) => run(() => setPlatformSettingAction(settingKey, String(v)), "Тохиргоо хадгалагдлаа.")} />
    </div>
  );
}

export function SettingText({ settingKey, value, label }: { settingKey: string; value: string; label: string }) {
  const { run, pending } = useRun();
  const [v, setV] = useState(value);
  return (
    <div className="flex items-end gap-2">
      <Field label={label} htmlFor={`set-${settingKey}`} className="flex-1">
        <Input id={`set-${settingKey}`} value={v} onChange={(e) => setV(e.target.value)} maxLength={120} />
      </Field>
      <Button variant="outline" disabled={pending || v === value} onClick={() => run(() => setPlatformSettingAction(settingKey, v.trim()), "Тохиргоо хадгалагдлаа.")}>
        Хадгалах
      </Button>
    </div>
  );
}

type Cat = { id: string; name: string; slug: string; imageUrl: string; sortOrder: number; active: boolean; services: number; businesses: number };

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const { run, pending } = useRun();
  const toast = useToast();
  const router = useRouter();
  const [draft, setDraft] = useState<{ id?: string; name: string; imageUrl: string; sortOrder: string; active: boolean } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();

  const save = () => {
    if (!draft) return;
    setErrors({});
    start(async () => {
      const res = await saveCategoryAction({ ...draft, sortOrder: Number(draft.sortOrder) });
      if (res.fieldErrors) setErrors(res.fieldErrors);
      else if (res.error) toast(res.error, "error");
      else {
        toast("Ангилал хадгалагдлаа.");
        setDraft(null);
        router.refresh();
      }
    });
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setDraft({ name: "", imageUrl: "", sortOrder: String(categories.length + 1), active: true })}>
          <Plus className="h-4 w-4" aria-hidden />
          Ангилал нэмэх
        </Button>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-surface">
        {categories.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[15px] font-medium">
                {c.name}
                {!c.active ? <Badge tone="warning">Идэвхгүй</Badge> : null}
              </p>
              <p className="text-[13px] text-stone">
                {c.businesses} бизнес, {c.services} үйлчилгээ, эрэмбэ {c.sortOrder}
              </p>
            </div>
            <Button variant="ghost" size="icon" aria-label={`${c.name} засах`} onClick={() => setDraft({ id: c.id, name: c.name, imageUrl: c.imageUrl, sortOrder: String(c.sortOrder), active: c.active })}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`${c.name} устгах`} disabled={pending} onClick={() => run(() => deleteCategoryAction(c.id), "Ангилал устгагдлаа.")}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Ангилал засах" : "Шинэ ангилал"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Болих
            </Button>
            <Button loading={busy} onClick={save}>
              Хадгалах
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="space-y-4">
            <Field label="Нэр" htmlFor="cat-name" error={errors.name}>
              <Input id="cat-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Зургийн холбоос" htmlFor="cat-img" error={errors.imageUrl}>
              <Input id="cat-img" type="url" value={draft.imageUrl} onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })} placeholder="https://" />
            </Field>
            <Field label="Эрэмбэ" htmlFor="cat-sort" error={errors.sortOrder}>
              <Input id="cat-sort" type="number" min={0} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between rounded-[12px] bg-ivory px-4 py-3">
              <span className="text-sm">Идэвхтэй</span>
              <Switch checked={draft.active} onChange={(v) => setDraft({ ...draft, active: v })} label="Идэвхтэй" />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
