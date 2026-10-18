import { Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function PlanGate({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-[18px] border border-dashed border-sand bg-surface px-8 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory text-stone">
        <Lock className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-stone">{description}</p>
      <ButtonLink href="/owner/settings#bagts" className="mt-6">
        Багцаа ахиулах
      </ButtonLink>
    </div>
  );
}
