"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormError, FormSuccess, SubmitButton } from "@/components/shared/form-bits";
import {
  loginAction,
  registerCustomerAction,
  registerOwnerAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/server/actions/auth";
import type { ActionState } from "@/lib/validation";

const initial: ActionState = {};

export function LoginForm({ next, resetDone }: { next?: string; resetDone?: boolean }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      {resetDone ? <FormSuccess message="Нууц үг амжилттай шинэчлэгдлээ. Нэвтэрнэ үү." /> : null}
      <FormError message={state.error} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="И-мэйл" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.mn" aria-invalid={Boolean(state.fieldErrors?.email)} required />
      </Field>
      <Field label="Нууц үг" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" aria-invalid={Boolean(state.fieldErrors?.password)} required />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-[13px] text-stone underline-offset-4 hover:text-ink hover:underline">
          Нууц үгээ мартсан уу?
        </Link>
      </div>
      <SubmitButton className="w-full">Нэвтрэх</SubmitButton>
    </form>
  );
}

function RegisterFields({ state }: { state: ActionState }) {
  return (
    <>
      <FormError message={state.error} />
      <Field label="Нэр" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" placeholder="Нэрээ бичнэ үү" aria-invalid={Boolean(state.fieldErrors?.name)} required />
      </Field>
      <Field label="И-мэйл" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.mn" aria-invalid={Boolean(state.fieldErrors?.email)} required />
      </Field>
      <Field label="Утасны дугаар" htmlFor="phone" error={state.fieldErrors?.phone} hint="8 оронтой дугаар, жишээ нь 9911 2345">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="9911 2345" aria-invalid={Boolean(state.fieldErrors?.phone)} required />
      </Field>
      <Field label="Нууц үг" htmlFor="password" error={state.fieldErrors?.password} hint="Хамгийн багадаа 8 тэмдэгт, үсэг болон тоо агуулна.">
        <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={Boolean(state.fieldErrors?.password)} required />
      </Field>
    </>
  );
}

export function RegisterCustomerForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerCustomerAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <RegisterFields state={state} />
      <SubmitButton className="w-full">Бүртгүүлэх</SubmitButton>
    </form>
  );
}

export function RegisterOwnerForm() {
  const [state, action] = useActionState(registerOwnerAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <RegisterFields state={state} />
      <SubmitButton className="w-full" variant="accent">Үргэлжлүүлэх</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, {} as ActionState<{ demoLink?: string }>);
  if (state.ok) {
    return (
      <div className="space-y-4">
        <FormSuccess message="Хэрэв энэ и-мэйл бүртгэлтэй бол нууц үг сэргээх холбоос илгээгдлээ." />
        {state.data?.demoLink ? (
          <div className="rounded-[12px] border border-dashed border-sand bg-ivory/60 p-4 text-sm">
            <p className="font-medium">Демо горим</p>
            <p className="mt-1 text-stone">И-мэйл илгээх үйлчилгээ холбогдоогүй тул холбоосыг эндээс нээнэ үү:</p>
            <Link href={state.data.demoLink.replace(/^https?:\/\/[^/]+/, "")} className="mt-2 block break-all text-accent underline underline-offset-4">
              Нууц үг шинэчлэх
            </Link>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <Field label="И-мэйл" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.mn" aria-invalid={Boolean(state.fieldErrors?.email)} required />
      </Field>
      <SubmitButton className="w-full">Холбоос илгээх</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="token" value={token} />
      <Field label="Шинэ нууц үг" htmlFor="password" error={state.fieldErrors?.password} hint="Хамгийн багадаа 8 тэмдэгт, үсэг болон тоо агуулна.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Нууц үгээ давтах" htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full">Нууц үг шинэчлэх</SubmitButton>
    </form>
  );
}
