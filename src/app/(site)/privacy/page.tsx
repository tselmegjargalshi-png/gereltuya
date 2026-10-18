import type { Metadata } from "next";

export const metadata: Metadata = { title: "Нууцлалын бодлого" };

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl py-14">
      <h1 className="font-display text-5xl">Нууцлалын бодлого</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-charcoal">
        <p>Бид зөвхөн захиалга хийх, мэдэгдэл илгээхэд шаардлагатай мэдээллийг (нэр, утас, и-мэйл) цуглуулдаг.</p>
        <p>Нууц үгийг шифрлэж хадгалдаг бөгөөд бизнес эзэмшигч зөвхөн өөрийн бизнестэй холбоотой үйлчлүүлэгчийн мэдээллийг харна.</p>
        <p>Та бүртгэлээ устгуулахыг хүсвэл hello@gereltuya.mn хаягаар холбогдоно уу.</p>
        <p className="rounded-[12px] bg-ivory p-4 text-sm text-stone">Энэ хуудас демо хувилбарын товч агуулга бөгөөд албан ёсны бодлого биш. Нийтэд нээхээс өмнө хуульчаар хянуулна уу.</p>
      </div>
    </div>
  );
}
