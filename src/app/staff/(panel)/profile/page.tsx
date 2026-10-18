import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { Avatar } from "@/components/ui/avatar";
import { PasswordForm } from "@/components/app/profile-forms";

export const metadata: Metadata = { title: "Профайл" };

export default async function StaffProfile() {
  const { staff, user } = await requireStaff();
  return (
    <div>
      <h1 className="font-display text-[2.2rem] leading-tight">Профайл</h1>
      <div className="mt-6 flex items-center gap-4 rounded-[16px] border border-line bg-surface p-5">
        <Avatar name={staff.name} src={staff.photoUrl} size={64} />
        <div>
          <p className="text-[17px] font-semibold">{staff.name}</p>
          <p className="text-sm text-stone">{staff.title}, {staff.business.name}</p>
          <p className="mt-1 text-[13px] text-mute">{user.email}</p>
        </div>
      </div>
      <p className="mt-4 text-[13px] text-stone">Ажлын цаг, үйлчилгээний өөрчлөлтийг бизнес эзэмшигч хийнэ.</p>
      <section className="mt-8 rounded-[16px] border border-line bg-surface p-6">
        <h2 className="mb-4 text-[15px] font-semibold">Нууц үг солих</h2>
        <div className="max-w-md">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
