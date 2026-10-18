import type { Metadata } from "next";

export const metadata: Metadata = { title: "Үйлчилгээний нөхцөл" };

export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl py-14">
      <h1 className="font-display text-5xl">Үйлчилгээний нөхцөл</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-charcoal">
        <p>GERELTUYA нь үйлчлүүлэгчид болон гоо сайхны бизнесүүдийг холбож, цаг захиалгыг хөнгөвчилдөг платформ юм.</p>
        <h2 className="pt-4 text-xl font-semibold">Захиалга</h2>
        <p>Захиалгыг бизнес бүрийн тогтоосон нөхцөлийн дагуу цуцлах, өөрчилнө. Үйлчилгээний төлбөрийг салон дээр шууд төлнө.</p>
        <h2 className="pt-4 text-xl font-semibold">Бизнесүүд</h2>
        <p>Бизнес эзэмшигч өөрийн үйлчилгээ, үнэ, ажлын цагийн мэдээллийг үнэн зөв байлгах үүрэгтэй.</p>
        <p className="rounded-[12px] bg-ivory p-4 text-sm text-stone">Энэ хуудас демо хувилбарын товч агуулга бөгөөд албан ёсны нөхцөл биш. Нийтэд нээхээс өмнө хуульчаар хянуулна уу.</p>
      </div>
    </div>
  );
}
