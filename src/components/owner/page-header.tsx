import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[2.2rem] leading-none md:text-[2.8rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-xl text-[14px] text-stone">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: { value: number | null; inverse?: boolean } }) {
  const d = delta?.value;
  const good = d == null ? null : delta?.inverse ? d <= 0 : d >= 0;
  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <p className="text-[13px] text-stone">{label}</p>
      <p className="mt-2 text-[1.6rem] font-semibold leading-none tracking-tight tabular">{value}</p>
      <p className="mt-2 flex items-center gap-2 text-[12px] text-mute">
        {d != null && d !== 0 ? (
          <span className={good ? "font-medium text-success" : "font-medium text-danger"}>
            {d > 0 ? "+" : ""}
            {(d * 100).toFixed(0)}%
          </span>
        ) : null}
        {hint}
      </p>
    </div>
  );
}
