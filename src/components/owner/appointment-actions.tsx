"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AppointmentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cancelOwnerAppointmentAction, setAppointmentStatusAction } from "@/server/actions/owner-appointments";

export function AppointmentActions({ id, status, customerName }: { id: string; status: AppointmentStatus; customerName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");

  if (status === "CANCELLED" || status === "COMPLETED" || status === "NO_SHOW") return null;

  const run = (next: AppointmentStatus, message: string) =>
    start(async () => {
      const res = await setAppointmentStatusAction(id, next);
      if (res.error) toast(res.error, "error");
      else {
        toast(message);
        router.refresh();
      }
    });

  const cancel = () =>
    start(async () => {
      const res = await cancelOwnerAppointmentAction(id, reason.trim() || undefined);
      if (res.error) toast(res.error, "error");
      else {
        toast("Захиалга цуцлагдлаа.");
        setConfirmCancel(false);
        router.refresh();
      }
    });

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "PENDING" ? (
          <Button size="sm" variant="accent" disabled={pending} onClick={() => run("CONFIRMED", "Захиалга баталгаажлаа.")}>
            Баталгаажуулах
          </Button>
        ) : null}
        <Button size="sm" variant="primary" disabled={pending} onClick={() => run("COMPLETED", "Үйлчилгээ дууссан гэж тэмдэглэлээ.")}>
          Дууссан
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run("NO_SHOW", "Ирээгүй гэж тэмдэглэлээ.")}>
          Ирээгүй
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmCancel(true)}>
          Цуцлах
        </Button>
      </div>
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Захиалгыг цуцлах уу?"
        description={`${customerName} үйлчлүүлэгчид мэдэгдэл очно.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Болих
            </Button>
            <Button variant="danger" loading={pending} onClick={cancel}>
              Цуцлах
            </Button>
          </>
        }
      >
        <label htmlFor={`reason-${id}`} className="mb-1.5 block text-[13px] font-medium">
          Шалтгаан (заавал биш)
        </label>
        <input
          id={`reason-${id}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={120}
          className="h-11 w-full rounded-[10px] border border-sand bg-surface px-3.5 text-[15px] focus:border-ink/50 focus:outline-none"
        />
      </Modal>
    </>
  );
}
