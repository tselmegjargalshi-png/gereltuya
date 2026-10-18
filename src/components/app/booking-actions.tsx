"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { SlotPicker, type PickerSlot } from "@/components/booking/slot-picker";
import { cancelMyBookingAction, rebookRedirect, rescheduleMyBookingAction } from "@/server/actions/customer";
import { getSlotsForAppointmentAction, getDaysForAppointmentAction } from "@/server/actions/slots";

export function BookingActions({
  appointmentId,
  canChange,
  locked,
  cancelWindowHours,
  canReview,
  showDetails = true,
}: {
  appointmentId: string;
  canChange: boolean;
  locked: boolean;
  cancelWindowHours: number;
  canReview?: boolean;
  showDetails?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"none" | "reschedule" | "cancel">("none");
  const [slot, setSlot] = useState<PickerSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const close = () => {
    setMode("none");
    setSlot(null);
    setError(null);
  };

  const reschedule = () => {
    if (!slot) return;
    start(async () => {
      const res = await rescheduleMyBookingAction(appointmentId, slot.startAt, slot.staffIds[0]);
      if (res.ok) {
        toast("Захиалгын цаг өөрчлөгдлөө.");
        close();
        router.refresh();
      } else setError(res.error ?? "Дахин оролдоно уу.");
    });
  };
  const cancel = () => {
    start(async () => {
      const res = await cancelMyBookingAction(appointmentId);
      if (res.ok) {
        toast("Захиалга цуцлагдлаа.", "info");
        close();
        router.refresh();
      } else setError(res.error ?? "Дахин оролдоно уу.");
    });
  };

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        {showDetails ? (
          <Link href={`/app/bookings/${appointmentId}`} className={buttonClass("outline", "sm")}>
            Дэлгэрэнгүй
          </Link>
        ) : null}
        {canChange ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setMode("reschedule")} disabled={locked} title={locked ? `Эхлэхээс ${cancelWindowHours} цагийн дотор өөрчлөх боломжгүй` : undefined}>
              Цаг өөрчлөх
            </Button>
            <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft" onClick={() => setMode("cancel")} disabled={locked}>
              Цуцлах
            </Button>
          </>
        ) : (
          <form action={rebookRedirect.bind(null, appointmentId)}>
            <Button type="submit" variant="secondary" size="sm">
              Дахин захиалах
            </Button>
          </form>
        )}
        {canReview ? (
          <Link href={`/app/bookings/${appointmentId}#review`} className={buttonClass("accent", "sm")}>
            Үнэлгээ өгөх
          </Link>
        ) : null}
        {canChange && locked ? <p className="w-full text-[12px] text-mute">Эхлэхээс {cancelWindowHours} цагийн дотор өөрчлөх, цуцлах боломжгүй. Салонтой шууд холбогдоно уу.</p> : null}
      </div>

      <Modal
        open={mode === "reschedule"}
        onClose={close}
        title="Цаг өөрчлөх"
        description="Шинэ өдөр, цагаа сонгоно уу."
        footer={
          <>
            <Button variant="ghost" onClick={close}>Болих</Button>
            <Button onClick={reschedule} disabled={!slot} loading={pending}>Хадгалах</Button>
          </>
        }
      >
        <SlotPicker
          deps={[appointmentId]}
          loadDays={() => getDaysForAppointmentAction(appointmentId)}
          loadSlots={(d) => getSlotsForAppointmentAction(appointmentId, d)}
          value={slot?.startAt ?? null}
          onChange={setSlot}
        />
        {error ? <p role="alert" className="mt-4 rounded-[12px] bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}
      </Modal>

      <Modal
        open={mode === "cancel"}
        onClose={close}
        title="Захиалгаа цуцлах уу?"
        description="Цуцалсан захиалгыг буцаах боломжгүй. Дахин цаг авахдаа шинээр захиалах шаардлагатай."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close}>Болих</Button>
            <Button variant="danger" onClick={cancel} loading={pending}>Цуцлах</Button>
          </>
        }
      >
        {error ? <p role="alert" className="rounded-[12px] bg-danger-soft p-3 text-sm text-danger">{error}</p> : null}
      </Modal>
    </>
  );
}
