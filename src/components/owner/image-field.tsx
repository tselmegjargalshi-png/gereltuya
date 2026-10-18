"use client";

import { ImageUp } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { uploadImageAction } from "@/server/actions/owner-business";

/** Image URL input. Uploading a file works when Vercel Blob is configured; a pasted link always works. */
export function ImageField({
  value,
  onChange,
  name,
  canUpload,
  shape = "round",
  id,
}: {
  value: string;
  onChange: (url: string) => void;
  name: string;
  canUpload: boolean;
  shape?: "round" | "wide";
  id: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const upload = (file: File) => {
    setError(undefined);
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await uploadImageAction(fd);
      if (res.error) setError(res.error);
      else if (res.data) onChange(res.data.url);
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        {shape === "round" ? (
          <Avatar name={name || "G"} src={value || null} size={52} />
        ) : (
          <div className="h-[52px] w-[88px] shrink-0 overflow-hidden rounded-[10px] bg-ivory ring-1 ring-line">
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
        )}
        <Input id={id} type="url" inputMode="url" placeholder="https://..." value={value} onChange={(e) => onChange(e.target.value)} />
        {canUpload ? (
          <>
            <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <Button variant="outline" size="icon" aria-label="Зураг оруулах" loading={pending} onClick={() => ref.current?.click()}>
              <ImageUp className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1.5 text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
