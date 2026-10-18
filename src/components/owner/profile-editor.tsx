"use client";

import { MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ImageField } from "@/components/owner/image-field";
import { DISTRICTS } from "@/lib/districts";
import { formatDuration, formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { addGalleryImageAction, removeGalleryImageAction, saveBusinessProfileAction, type ProfileInput } from "@/server/actions/owner-business";

type State = {
  name: string;
  tagline: string;
  description: string;
  address: string;
  district: string;
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  website: string;
  logoUrl: string;
  coverUrl: string;
  categoryIds: string[];
};

export function ProfileEditor({
  initial,
  categories,
  gallery,
  services,
  slug,
  canUpload,
}: {
  initial: State;
  categories: { id: string; name: string }[];
  gallery: { id: string; imageUrl: string }[];
  services: { id: string; name: string; price: number; durationMin: number }[];
  slug: string;
  canUpload: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState<State>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newImage, setNewImage] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  const save = () =>
    start(async () => {
      setErrors({});
      const res = await saveBusinessProfileAction(s as ProfileInput);
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        toast("Мэдээллээ шалгана уу.", "error");
      } else if (res.error) toast(res.error, "error");
      else {
        toast("Профайл хадгалагдлаа.");
        router.refresh();
      }
    });

  const addImage = () =>
    start(async () => {
      const res = await addGalleryImageAction(newImage);
      if (res.error) toast(res.error, "error");
      else {
        setNewImage("");
        toast("Зураг нэмэгдлээ.");
        router.refresh();
      }
    });
  const removeImage = (id: string) =>
    start(async () => {
      const res = await removeGalleryImageAction(id);
      if (res.error) toast(res.error, "error");
      else router.refresh();
    });

  const chosen = categories.filter((c) => s.categoryIds.includes(c.id));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <section className="space-y-4 rounded-[16px] border border-line bg-surface p-6" aria-labelledby="p-basic">
          <h2 id="p-basic" className="text-[15px] font-semibold">Үндсэн мэдээлэл</h2>
          <Field label="Бизнесийн нэр" htmlFor="p-name" error={errors.name}>
            <Input id="p-name" value={s.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Богино тайлбар" htmlFor="p-tag" error={errors.tagline} hint="Нэрийн доор харагдана.">
            <Input id="p-tag" value={s.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={90} />
          </Field>
          <Field label="Дэлгэрэнгүй танилцуулга" htmlFor="p-desc" error={errors.description}>
            <Textarea id="p-desc" value={s.description} onChange={(e) => set("description", e.target.value)} maxLength={1200} className="min-h-32" />
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
          </fieldset>
        </section>

        <section className="space-y-4 rounded-[16px] border border-line bg-surface p-6" aria-labelledby="p-contact">
          <h2 id="p-contact" className="text-[15px] font-semibold">Хаяг, холбоо барих</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Дүүрэг" htmlFor="p-district" error={errors.district}>
              <Select id="p-district" value={s.district} onChange={(e) => set("district", e.target.value)}>
                <option value="">Сонгоно уу</option>
                {DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Утас" htmlFor="p-phone" error={errors.phone}>
              <Input id="p-phone" inputMode="tel" value={s.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9911 2233" />
            </Field>
          </div>
          <Field label="Хаяг" htmlFor="p-address" error={errors.address}>
            <Input id="p-address" value={s.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="И-мэйл" htmlFor="p-email" error={errors.email}>
              <Input id="p-email" type="email" value={s.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Вэбсайт" htmlFor="p-web" error={errors.website}>
              <Input id="p-web" type="url" value={s.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
            </Field>
            <Field label="Instagram холбоос" htmlFor="p-ig" error={errors.instagram}>
              <Input id="p-ig" type="url" value={s.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="https://instagram.com/..." />
            </Field>
            <Field label="Facebook холбоос" htmlFor="p-fb" error={errors.facebook}>
              <Input id="p-fb" type="url" value={s.facebook} onChange={(e) => set("facebook", e.target.value)} placeholder="https://facebook.com/..." />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-[16px] border border-line bg-surface p-6" aria-labelledby="p-img">
          <h2 id="p-img" className="text-[15px] font-semibold">Зураг</h2>
          {!canUpload ? <p className="text-[13px] text-stone">Зургийн холбоос (https) оруулна уу.</p> : null}
          <Field label="Лого" htmlFor="p-logo" error={errors.logoUrl}>
            <ImageField id="p-logo" name={s.name} value={s.logoUrl} onChange={(v) => set("logoUrl", v)} canUpload={canUpload} />
          </Field>
          <Field label="Нүүр зураг" htmlFor="p-cover" error={errors.coverUrl}>
            <ImageField id="p-cover" name={s.name} value={s.coverUrl} onChange={(v) => set("coverUrl", v)} canUpload={canUpload} shape="wide" />
          </Field>
          <div>
            <p className="mb-2 text-[13px] font-medium">Зургийн цомог ({gallery.length}/24)</p>
            {gallery.length ? (
              <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {gallery.map((g) => (
                  <li key={g.id} className="group relative aspect-square overflow-hidden rounded-[10px] bg-ivory">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    <button type="button" onClick={() => removeImage(g.id)} aria-label="Зургийг устгах" className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-ink/70 text-paper opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Input aria-label="Цомгийн зургийн холбоос" type="url" placeholder="https://..." value={newImage} onChange={(e) => setNewImage(e.target.value)} />
              <Button variant="outline" onClick={addImage} disabled={!newImage} loading={pending}>
                <Plus className="h-4 w-4" aria-hidden />
                Нэмэх
              </Button>
            </div>
          </div>
        </section>

        <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-full border border-line bg-surface/95 px-5 py-3 shadow-[var(--shadow-soft)] backdrop-blur lg:bottom-4">
          <p className="text-[13px] text-stone">{dirty ? "Хадгалаагүй өөрчлөлт байна." : "Бүх өөрчлөлт хадгалагдсан."}</p>
          <Button onClick={save} loading={pending} disabled={!dirty}>
            Хадгалах
          </Button>
        </div>
      </div>

      <aside aria-labelledby="preview-title" className="lg:sticky lg:top-24 lg:self-start">
        <p id="preview-title" className="mb-3 text-[13px] font-medium text-stone">
          Үйлчлүүлэгчдэд харагдах байдал
        </p>
        <div className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-[var(--shadow-soft)]">
          <div className="relative aspect-[16/10] bg-gradient-to-br from-nude/60 via-ivory to-sand">
            {s.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-display text-5xl text-accent-deep/60">{(s.name || "G").slice(0, 1)}</span>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3">
              {s.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.logoUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-line" />
              ) : null}
              <div className="min-w-0">
                <h3 className="truncate text-[18px] font-semibold">{s.name || "Бизнесийн нэр"}</h3>
                {s.tagline ? <p className="truncate text-[13px] text-stone">{s.tagline}</p> : null}
              </div>
            </div>
            {chosen.length ? <p className="mt-3 text-[13px] text-stone">{chosen.map((c) => c.name).join(" • ")}</p> : null}
            <p className="mt-3 flex items-start gap-1.5 text-[13px] text-stone">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {[s.district, s.address].filter(Boolean).join(", ") || "Хаяг оруулаагүй"}
            </p>
            {s.phone ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-stone">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {s.phone}
              </p>
            ) : null}
            {s.description ? <p className="mt-4 line-clamp-4 text-[13.5px] leading-relaxed text-charcoal">{s.description}</p> : null}
            {services.length ? (
              <ul className="mt-4 divide-y divide-line border-t border-line">
                {services.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                    <span className="min-w-0 truncate">
                      {v.name} <span className="text-mute">· {formatDuration(v.durationMin)}</span>
                    </span>
                    <span className="font-medium tabular">{formatMoney(v.price)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <a href={`/b/${slug}`} target="_blank" rel="noreferrer" className="mt-4 flex h-11 items-center justify-center rounded-full bg-ink text-sm font-medium text-paper">
              Нийтийн хуудсыг нээх
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
