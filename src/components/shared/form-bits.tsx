"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children, className, variant = "primary" }: { children: React.ReactNode; className?: string; variant?: "primary" | "accent" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} size="lg" variant={variant} className={className}>
      {children}
    </Button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-danger">
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-[12px] bg-success-soft px-4 py-3 text-sm text-success">
      {message}
    </p>
  );
}
