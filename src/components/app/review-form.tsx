"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StarsInput } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/shared/form-bits";
import { useToast } from "@/components/ui/toast";
import { submitReviewAction } from "@/server/actions/customer";
import type { ActionState } from "@/lib/validation";

export function ReviewForm({ appointmentId }: { appointmentId: string }) {
  const [rating, setRating] = useState(0);
  const [state, action] = useActionState(submitReviewAction, {} as ActionState);
  const toast = useToast();
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast("Үнэлгээ өгсөнд баярлалаа.");
      router.refresh();
    }
  }, [state.ok, toast, router]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <FormError message={state.error ?? state.fieldErrors?.rating} />
      <StarsInput value={rating} onChange={setRating} />
      <Textarea name="comment" placeholder="Үйлчилгээний талаарх сэтгэгдлээ бичнэ үү (заавал биш)" maxLength={600} />
      <SubmitButton>Үнэлгээ илгээх</SubmitButton>
    </form>
  );
}
