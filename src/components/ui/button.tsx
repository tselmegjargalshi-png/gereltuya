import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-charcoal active:bg-black",
  accent: "bg-accent text-paper hover:bg-accent-deep",
  secondary: "bg-ivory text-ink hover:bg-sand/70",
  outline: "border border-sand bg-surface text-ink hover:border-ink/40",
  ghost: "text-ink hover:bg-ivory",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-[15px] gap-2.5",
  icon: "h-10 w-10 justify-center",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-medium transition-[background,border,color,transform] duration-200 ease-[var(--ease-out-soft)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
