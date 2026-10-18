import { BarChart } from "@/components/charts/bar-chart";
import { formatMoney, formatTime } from "@/lib/format";
import type { Analytics } from "@/server/analytics";

export type PreviewAppointment = { id: string; startAt: Date; service: string; staff: string };

/** Real numbers calculated from the demo business, framed as an app window. */
export function DashboardPreview({ analytics, today, businessName }: { analytics: Analytics; today: PreviewAppointment[]; businessName: string }) {
  const stats = [
    { label: "7 хоногийн орлого", value: formatMoney(analytics.revenue) },
    { label: "Захиалга", value: String(analytics.bookings) },
    { label: "Дундаж захиалга", value: formatMoney(analytics.avgOrder) },
    { label: "Шинэ үйлчлүүлэгч", value: String(analytics.newCustomers) },
  ];
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-[var(--shadow-float)] md:[transform:perspective(1600px)_rotateX(4deg)] md:transition-transform md:duration-700 md:hover:[transform:perspective(1600px)_rotateX(0deg)]">
        <div className="flex items-center gap-2 border-b border-line bg-ivory/70 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-sand" />
          <span className="h-2.5 w-2.5 rounded-full bg-sand" />
          <span className="h-2.5 w-2.5 rounded-full bg-sand" />
          <span className="ml-3 text-[12px] text-stone">{businessName} · Хянах самбар</span>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-[1.6fr_1fr] md:p-6">
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-[12px] bg-ivory/60 p-3.5">
                  <p className="text-[11px] text-stone">{s.label}</p>
                  <p className="mt-1 text-[15px] font-semibold tabular md:text-base">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <BarChart
                data={analytics.series.map((p) => ({ key: p.key, label: p.label, value: p.revenue, secondary: p.bookings }))}
                height={170}
                highlightLast
              />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold">Өнөөдрийн захиалга</p>
            <ul className="mt-3 divide-y divide-line">
              {today.length === 0 ? <li className="py-6 text-sm text-stone">Өнөөдөр захиалга алга.</li> : null}
              {today.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="w-12 text-[13px] font-semibold tabular">{formatTime(a.startAt)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{a.service}</span>
                    <span className="block text-[12px] text-stone">{a.staff}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
