"use client";

import { useActionState, useEffect } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/shared/form-bits";
import { useToast } from "@/components/ui/toast";
import { changePasswordAction, updateProfileAction } from "@/server/actions/customer";
import type { ActionState } from "@/lib/validation";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, {} as ActionState);
  const toast = useToast();
  useEffect(() => {
    if (state.ok) toast("Өөрчлөлт хадгалагдлаа.");
  }, [state, toast]);
  return (
    <form action={action} className="space-y-5">
      <FormError message={state.error} />
      <Field label="Нэр" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <Field label="Утасны дугаар" htmlFor="phone" error={state.fieldErrors?.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={phone} required />
      </Field>
      <Field label="И-мэйл" htmlFor="email" hint="И-мэйл хаягийг өөрчлөх боломжгүй.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <SubmitButton>Хадгалах</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {} as ActionState);
  const toast = useToast();
  useEffect(() => {
    if (state.ok) toast("Нууц үг шинэчлэгдлээ.");
  }, [state, toast]);
  return (
    <form action={action} className="space-y-5">
      <FormError message={state.error} />
      <Field label="Одоогийн нууц үг" htmlFor="current" error={state.fieldErrors?.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Шинэ нууц үг" htmlFor="next" error={state.fieldErrors?.next} hint="Хамгийн багадаа 8 тэмдэгт, үсэг болон тоо агуулна.">
        <Input id="next" name="next" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton>Нууц үг солих</SubmitButton>
    </form>
  );
}
