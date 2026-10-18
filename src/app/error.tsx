"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl">Мэдээлэл ачааллахад алдаа гарлаа.</h1>
      <p className="mt-3 max-w-md text-stone">Дахин оролдоно уу. Асуудал үргэлжилбэл хэсэг хугацааны дараа дахин орно уу.</p>
      <div className="mt-8 flex gap-3">
        <Button size="lg" onClick={reset}>
          Дахин оролдох
        </Button>
        <ButtonLink href="/" variant="outline" size="lg">
          Нүүр хуудас
        </ButtonLink>
      </div>
    </div>
  );
}
