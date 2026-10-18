import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-[10px] border border-sand bg-surface px-3.5 text-[15px] text-ink placeholder:text-mute transition-colors focus:border-ink/50 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/15 disabled:bg-ivory disabled:text-stone aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(control, "min-h-24 py-3 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        control,
        "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b625a%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_0.9rem_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-charcoal">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-mute">{hint}</p>
      ) : null}
    </div>
  );
}
