"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { toggleFavoriteAction } from "@/server/actions/customer";
import { useToast } from "@/components/ui/toast";

export function FavoriteButton({
  businessId,
  staffId,
  initial,
  signedIn,
  className,
}: {
  businessId?: string;
  staffId?: string;
  initial: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Хадгалснаас хасах" : "Хадгалах"}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        const next = !saved;
        setSaved(next);
        start(async () => {
          const res = await toggleFavoriteAction({ businessId, staffId });
          if (!res.ok) {
            setSaved(!next);
            toast("Хадгалж чадсангүй. Дахин оролдоно уу.", "error");
          } else toast(next ? "Хадгалсан жагсаалтад нэмлээ." : "Хадгалсан жагсаалтаас хаслаа.", "info");
        });
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-ink backdrop-blur transition-transform hover:scale-105 active:scale-95",
        className,
      )}
    >
      <Heart className={cn("h-[18px] w-[18px] transition-colors", saved ? "fill-accent text-accent" : "")} aria-hidden />
    </button>
  );
}
