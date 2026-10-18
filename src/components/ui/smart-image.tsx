"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** next/image with an elegant monogram fallback when a remote image fails to load. */
export function SmartImage({ alt, className, fallbackLabel, ...props }: ImageProps & { fallbackLabel?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !props.src) {
    const label = (fallbackLabel ?? alt ?? "G").trim();
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-nude/60 via-ivory to-sand text-accent-deep/70",
          props.fill ? "absolute inset-0" : "",
          className,
        )}
      >
        <span className="font-display text-3xl">{label.slice(0, 1)}</span>
      </div>
    );
  }
  return <Image alt={alt} className={className} onError={() => setFailed(true)} {...props} />;
}
