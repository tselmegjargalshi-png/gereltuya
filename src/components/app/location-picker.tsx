"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { DISTRICTS } from "@/lib/districts";

export function LocationPicker({ value, path }: { value: string; path: string }) {
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-1.5 text-[13px] text-stone">
      <MapPin className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">Байршил сонгох</span>
      <select
        value={value}
        onChange={(e) => router.replace(`${path}?loc=${encodeURIComponent(e.target.value)}`, { scroll: false })}
        className="cursor-pointer bg-transparent font-medium text-ink outline-none"
      >
        {DISTRICTS.map((d) => (
          <option key={d.name} value={d.name}>
            {d.name}
          </option>
        ))}
      </select>
    </label>
  );
}
