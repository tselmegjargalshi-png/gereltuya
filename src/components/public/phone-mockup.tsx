import { Home, Search, CalendarDays, Heart, User } from "lucide-react";
import { formatMoney, formatTime, formatLongDate } from "@/lib/format";

export type PhonePreview = {
  customerName: string;
  business: string;
  service: string;
  staff: string;
  startAt: Date;
  price: number;
};

/** Static, server-rendered preview of the customer app. Hover lifts it slightly in 3D. */
export function PhoneMockup({ preview, categories }: { preview: PhonePreview; categories: string[] }) {
  return (
    <div className="group mx-auto w-[280px] [perspective:1200px]">
      <div className="relative rounded-[38px] border border-ink/80 bg-ink p-[9px] shadow-[var(--shadow-float)] transition-transform duration-700 ease-[var(--ease-out-soft)] [transform:rotateY(-8deg)_rotateX(3deg)] group-hover:[transform:rotateY(0deg)_rotateX(0deg)_translateY(-6px)] motion-reduce:transition-none">
        <div className="overflow-hidden rounded-[30px] bg-paper">
          <div className="px-4 pb-3 pt-5">
            <p className="text-[11px] text-mute">Сайн байна уу, {preview.customerName}</p>
            <p className="mt-0.5 text-[17px] font-semibold">Юу хийлгэх вэ?</p>
            <div className="mt-3 flex items-center gap-2 rounded-full border border-sand bg-surface px-3 py-2 text-[12px] text-mute">
              <Search className="h-3.5 w-3.5" aria-hidden />
              Үйлчилгээ эсвэл салон хайх
            </div>
            <div className="mt-3 flex gap-1.5 overflow-hidden">
              {categories.slice(0, 4).map((c) => (
                <span key={c} className="shrink-0 rounded-full bg-ivory px-2.5 py-1 text-[11px] text-charcoal">
                  {c}
                </span>
              ))}
            </div>
            <p className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-[0.12em] text-mute">Таны дараагийн захиалга</p>
            <div className="rounded-[14px] bg-ink p-3.5 text-paper">
              <p className="text-[11px] text-paper/60">{preview.business}</p>
              <p className="mt-0.5 text-[14px] font-semibold">{preview.service}</p>
              <p className="mt-2 text-[12px] text-paper/80">
                {formatLongDate(preview.startAt)} · {formatTime(preview.startAt)}
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-paper/15 pt-2.5 text-[12px]">
                <span className="text-paper/70">{preview.staff}</span>
                <span className="font-semibold tabular">{formatMoney(preview.price)}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-5 border-t border-line bg-surface px-1 py-2.5 text-center text-[9.5px] text-mute">
            {[
              [Home, "Нүүр", true],
              [Search, "Хайх", false],
              [CalendarDays, "Захиалга", false],
              [Heart, "Хадгалсан", false],
              [User, "Профайл", false],
            ].map(([Icon, label, active]) => {
              const I = Icon as typeof Home;
              return (
                <span key={label as string} className={active ? "text-ink" : ""}>
                  <I className="mx-auto mb-0.5 h-4 w-4" aria-hidden />
                  {label as string}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
