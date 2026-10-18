import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/owner/page-header";
import { PasswordForm } from "@/components/app/profile-forms";
import { SettingSwitch, SettingText } from "@/components/admin/admin-controls";

export const metadata: Metadata = { title: "Тохиргоо" };

export default async function AdminSettings() {
  const rows = await db.platformSetting.findMany();
  const get = (k: string, d = "") => rows.find((r) => r.key === k)?.value ?? d;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Тохиргоо" description="Платформын ерөнхий тохиргоо." />
      <section className="space-y-5 rounded-[16px] border border-line bg-surface p-6">
        <h2 className="text-[15px] font-semibold">Бизнес бүртгэл</h2>
        <SettingSwitch settingKey="autoApproveBusinesses" value={get("autoApproveBusinesses", "true") === "true"} label="Шинэ бизнесийг автоматаар батлах" description="Унтраавал бүртгэл дууссан бизнес таны зөвшөөрлийг хүлээнэ." />
      </section>
      <section className="space-y-4 rounded-[16px] border border-line bg-surface p-6">
        <h2 className="text-[15px] font-semibold">Холбоо барих мэдээлэл</h2>
        <SettingText settingKey="supportEmail" value={get("supportEmail")} label="Дэмжлэгийн и-мэйл" />
        <SettingText settingKey="supportPhone" value={get("supportPhone")} label="Дэмжлэгийн утас" />
      </section>
      <section className="rounded-[16px] border border-line bg-surface p-6">
        <h2 className="mb-4 text-[15px] font-semibold">Нууц үг солих</h2>
        <div className="max-w-md">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
