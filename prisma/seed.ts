/* eslint-disable no-console */
import { PrismaClient, type AppointmentStatus, type Plan } from "@prisma/client";
import bcrypt from "bcryptjs";
import { IMG, unsplash } from "../src/lib/images";
import { addDays, addMinutes, hhmmToMinutes, ubDate, ubParts, ubStartOfDay } from "../src/lib/time";

const db = new PrismaClient();

// Deterministic randomness so every seed produces the same demo world.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261017);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const DEMO_PASSWORD = "Demo1234";

type CatKey = "hair" | "nails" | "lashes" | "brows" | "makeup" | "skincare" | "barber" | "spa" | "aesthetic";

const CATEGORIES: { key: CatKey; slug: string; name: string }[] = [
  { key: "hair", slug: "us", name: "Үс" },
  { key: "nails", slug: "hums", name: "Хумс" },
  { key: "lashes", slug: "sormuus", name: "Сормуус" },
  { key: "brows", slug: "humsug", name: "Хөмсөг" },
  { key: "makeup", slug: "nuur-budalt", name: "Нүүр будалт" },
  { key: "skincare", slug: "arisy-archilgaa", name: "Арьс арчилгаа" },
  { key: "barber", slug: "barber", name: "Барбер" },
  { key: "spa", slug: "spa", name: "Спа" },
  { key: "aesthetic", slug: "goo-saihan", name: "Гоо сайхны үйлчилгээ" },
];

type ServiceSeed = { name: string; description: string; durationMin: number; price: number };

const SERVICES: Record<CatKey, ServiceSeed[]> = {
  hair: [
    { name: "Үс засалт", description: "Үсний бүтэц, нүүрний хэлбэрт тохирсон засалт. Угаалт, хатаалт багтсан.", durationMin: 60, price: 45_000 },
    { name: "Үс будалт (нэг өнгө)", description: "Мэргэжлийн будгаар үсийг жигд, тод өнгөтэй болгоно. Өнгөний зөвлөгөө үнэгүй.", durationMin: 120, price: 120_000 },
    { name: "Балаяж", description: "Байгалийн шилжилттэй гэрэлтүүлэг. Үсний урт, нягтаас хамааран хугацаа өөрчлөгдөж болно.", durationMin: 180, price: 260_000 },
    { name: "Кератин эмчилгээ", description: "Үсийг зөөлөн, гялгар, амар засагддаг болгож, хуйралтыг багасгана.", durationMin: 150, price: 180_000 },
    { name: "Үс угаалт, хатаалт", description: "Арчилгааны шампунь, маск хэрэглэн угааж, хүссэн хэлбэрээр хатаана.", durationMin: 45, price: 25_000 },
    { name: "Баярын үс засалт", description: "Ёслол, хурим, баярт зориулсан үс хийц. Урьдчилан зураг илгээвэл илүү тохиромжтой.", durationMin: 75, price: 80_000 },
  ],
  nails: [
    { name: "Гелэн маникюр", description: "Хумсны арьс арчилгаа, хэлбэржүүлэлт болон 3 хүртэл долоо хоног тогтдог гель будалт.", durationMin: 90, price: 65_000 },
    { name: "Маникюр", description: "Хумсны хэлбэржүүлэлт, арьс арчилгаа, энгийн будалт.", durationMin: 45, price: 35_000 },
    { name: "Гелэн педикюр", description: "Хөлийн арчилгаа, өнгөр арилгалт, гель будалт.", durationMin: 90, price: 75_000 },
    { name: "Хумсны уртасгалт", description: "Гель эсвэл акригелээр хумсыг хүссэн урт, хэлбэрт оруулна.", durationMin: 120, price: 95_000 },
    { name: "Гель арилгалт", description: "Хумсанд гэмтэлгүйгээр хуучин гель будгийг арилгана.", durationMin: 30, price: 15_000 },
    { name: "Хумсны дизайн", description: "10 хурууны зураг, чимэглэл. Гелэн маникюртай хамт захиалахад тохиромжтой.", durationMin: 30, price: 20_000 },
  ],
  lashes: [
    { name: "Сормуус суулгалт (сонгодог)", description: "Нэг сормуусанд нэг ширхэг. Байгалийн, цэвэрхэн харагдана.", durationMin: 120, price: 80_000 },
    { name: "Сормуус суулгалт (хэмжээст)", description: "2D, 3D хэмжээст арга. Илүү өтгөн, тод харагдах үр дүн.", durationMin: 150, price: 110_000 },
    { name: "Сормуус өргөлт", description: "Өөрийн сормуусыг өргөж, будаж, 6 хүртэл долоо хоног тогтоно.", durationMin: 60, price: 60_000 },
    { name: "Сормуус засвар", description: "Суулгалт хийснээс хойш 2 to 3 долоо хоногийн дотор хийх нөхөлт.", durationMin: 60, price: 50_000 },
  ],
  brows: [
    { name: "Хөмсөг засалт", description: "Нүүрний хэлбэрт тохирсон хөмсөгний хэлбэр гаргаж, утсаар засна.", durationMin: 30, price: 25_000 },
    { name: "Хөмсөг будалт", description: "Хинна эсвэл будгаар хөмсгийг тод, жигд өнгөтэй болгоно.", durationMin: 30, price: 30_000 },
    { name: "Хөмсөг ламинаци", description: "Хөмсгийг өтгөн, эмх цэгцтэй харагдуулж, 6 долоо хоног хүртэл тогтоно.", durationMin: 60, price: 55_000 },
    { name: "Хөмсөгний пудра тату", description: "Зөөлөн, нунтаг мэт эффекттэй хагас байнгын будалт. Засвар нэг удаа үнэгүй.", durationMin: 150, price: 350_000 },
  ],
  makeup: [
    { name: "Өдрийн нүүр будалт", description: "Хөнгөн, байгалийн өнгө аястай будалт. Зураг авалт, уулзалтад тохиромжтой.", durationMin: 60, price: 80_000 },
    { name: "Үдшийн нүүр будалт", description: "Арга хэмжээ, баярт зориулсан тод, удаан тогтдог будалт.", durationMin: 75, price: 120_000 },
    { name: "Хуримын нүүр будалт", description: "Туршилтын будалт, хуримын өдрийн будалт багтсан. Урьдчилан зөвлөлдөнө.", durationMin: 120, price: 250_000 },
  ],
  skincare: [
    { name: "Нүүрний гүн цэвэрлэгээ", description: "Нүх сүвийг цэвэрлэж, арьсны тосны ялгаралтыг тэнцвэржүүлнэ.", durationMin: 75, price: 90_000 },
    { name: "Чийгшүүлэх арчилгаа", description: "Хуурай, ядарсан арьсанд зориулсан чийгшүүлэх маск, массаж.", durationMin: 60, price: 110_000 },
    { name: "Химийн пилинг", description: "Арьсны өнгө жигдрүүлж, толбо, батга сорвийг багасгана. Зөвлөгөөний дараа хийнэ.", durationMin: 60, price: 150_000 },
  ],
  barber: [
    { name: "Эрэгтэй үс засалт", description: "Хэлбэрийн зөвлөгөө, засалт, угаалт, загварчлал.", durationMin: 45, price: 35_000 },
    { name: "Фэйд засалт", description: "Нарийн шилжилттэй фэйд, тойм засалт.", durationMin: 45, price: 40_000 },
    { name: "Сахал засалт", description: "Сахлын хэлбэр гаргаж, халуун алчуур, тос түрхэлттэй.", durationMin: 30, price: 20_000 },
    { name: "Үс, сахал багц", description: "Үс засалт болон сахал засалт хамт. Хамгийн их захиалгатай.", durationMin: 75, price: 50_000 },
    { name: "Хүүхдийн үс засалт", description: "12 хүртэлх насны хүүхдэд зориулсан тайван, хурдан засалт.", durationMin: 30, price: 25_000 },
  ],
  spa: [
    { name: "Бүтэн биеийн массаж", description: "Булчингийн хурцадмал байдлыг тайлж, бүх биеийг сэргээнэ.", durationMin: 60, price: 120_000 },
    { name: "Халуун чулуун массаж", description: "Халаасан базальт чулуугаар гүн тайвшруулах массаж.", durationMin: 90, price: 150_000 },
    { name: "Нуруу, хүзүүний массаж", description: "Удаан суугаад ажилладаг хүмүүст зориулсан чиглэлтэй массаж.", durationMin: 45, price: 70_000 },
    { name: "Хөлийн массаж", description: "Хөлийн цэгэн массаж, ургамлын ваннтай.", durationMin: 45, price: 60_000 },
  ],
  aesthetic: [
    { name: "Микронидлинг", description: "Арьсны нөхөн төлжилтийг дэмжиж, нүх сүв, сорвийг багасгана.", durationMin: 60, price: 250_000 },
    { name: "Аппаратын арчилгаа", description: "Хэт авиа, RF аппаратаар арьсыг чангалж, гэрэлтүүлнэ.", durationMin: 60, price: 180_000 },
    { name: "Лазер үс авалт (суга)", description: "Диодын лазераар үсийг удаан хугацаанд багасгана. Хэд хэдэн удаа хийх шаардлагатай.", durationMin: 30, price: 90_000 },
  ],
};
// Fix: lash refill copy uses natural phrasing.
SERVICES.lashes[3].description = "Суулгалт хийснээс хойш 2-3 долоо хоногийн дотор хийх нөхөлт.";

type StaffSeed = { name: string; title: string; cats: CatKey[]; years: number; male?: boolean; bio: string; offDay?: number };

type BizSeed = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  district: string;
  address: string;
  phone: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  cats: CatKey[];
  cover: string;
  plan: Plan;
  ownerName: string;
  ownerEmail: string;
  sunday: "closed" | "short";
  staff: StaffSeed[];
  lat: number;
  lng: number;
  targetReviews: number;
};

const BUSINESSES: BizSeed[] = [
  {
    slug: "noir-studio",
    name: "NOIR STUDIO",
    tagline: "Үс, хумс, сормуусны нэг дор үйлчилгээ",
    description:
      "NOIR STUDIO нь 2019 оноос хойш Сөүлийн гудамжинд үйл ажиллагаа явуулж буй гоо сайхны студи юм. Бид тайван орчин, цэвэр ариун байдал, нарийн гар урлалыг эрхэмлэдэг. Үс, хумс, сормуусны үйлчилгээг нэг дороос авах боломжтой.",
    district: "Сүхбаатар дүүрэг",
    address: "Сүхбаатар дүүрэг, 1-р хороо, Сөүлийн гудамж 21",
    phone: "8811 2233",
    instagram: "https://instagram.com/noirstudio.ub",
    facebook: "https://facebook.com/noirstudio.ub",
    website: "https://noirstudio.mn",
    cats: ["hair", "nails", "lashes"],
    cover: IMG.interiors[0],
    plan: "PRO",
    ownerName: "Оюунчимэг",
    ownerEmail: "owner@gereltuya.mn",
    sunday: "short",
    lat: 47.9135,
    lng: 106.9155,
    targetReviews: 128,
    staff: [
      { name: "Саруул", title: "Маникюрист", cats: ["nails"], years: 6, bio: "Гелэн маникюр, хумсны нарийн дизайн хийдэг. Цэвэрхэн, минимал хэв маягт дуртай.", offDay: 0 },
      { name: "Ариунаа", title: "Үсчин", cats: ["hair"], years: 9, bio: "Эмэгтэй үс засалт, балаяж, өнгө будалтаар мэргэшсэн. Сөүлд мэргэжил дээшлүүлсэн.", offDay: 1 },
      { name: "Номин", title: "Сормуусны мастер", cats: ["lashes"], years: 5, bio: "Сонгодог болон хэмжээст сормуус суулгалт, сормуус өргөлт хийдэг.", offDay: 2 },
      { name: "Мөнхзул", title: "Маникюрист", cats: ["nails"], years: 3, bio: "Педикюр, хумсны уртасгалт, өнгөний хослолоор зөвлөгөө өгдөг.", offDay: 3 },
      { name: "Тэмүүлэн", title: "Үсний стилист", cats: ["hair"], years: 7, male: true, bio: "Эрэгтэй, эмэгтэй үс засалт, кератин эмчилгээ хийдэг.", offDay: 4 },
    ],
  },
  {
    slug: "luna-nail",
    name: "LUNA NAIL",
    tagline: "Хумсны арчилгаа, дизайн",
    description:
      "Зайсанд байрлах LUNA NAIL нь зөвхөн хумсны үйлчилгээнд төвлөрдөг жижиг студи. Нэг удаагийн хэрэгсэл, ариутгалын стандартыг чанд мөрддөг.",
    district: "Хан-Уул дүүрэг",
    address: "Хан-Уул дүүрэг, 11-р хороо, Зайсангийн гудамж 12",
    phone: "9911 4567",
    instagram: "https://instagram.com/lunanail.mn",
    cats: ["nails"],
    cover: IMG.interiors[10],
    plan: "PRO",
    ownerName: "Хулан",
    ownerEmail: "luna@gereltuya.mn",
    sunday: "short",
    lat: 47.8845,
    lng: 106.9175,
    targetReviews: 86,
    staff: [
      { name: "Хулан", title: "Маникюрист", cats: ["nails"], years: 8, bio: "Студийн үүсгэн байгуулагч. Гелэн маникюр, франц будалтын мастер.", offDay: 6 },
      { name: "Уянга", title: "Маникюрист", cats: ["nails"], years: 4, bio: "Хумсны дизайн, гоёл чимэглэлд дуртай.", offDay: 0 },
      { name: "Мишээл", title: "Педикюрын мастер", cats: ["nails"], years: 5, bio: "Аппаратын педикюр, хөлийн арчилгаа хийдэг.", offDay: 2 },
    ],
  },
  {
    slug: "north-barber",
    name: "NORTH BARBER",
    tagline: "Эрэгтэй үс засалт, сахал арчилгаа",
    description:
      "NORTH BARBER бол сонгодог барбершопын соёлыг орчин үеийн хэв маягтай хослуулсан газар. Кофе ууж, тайван суугаад, нарийн засалт хийлгээрэй.",
    district: "Чингэлтэй дүүрэг",
    address: "Чингэлтэй дүүрэг, 4-р хороо, Бага тойруу 34",
    phone: "8800 7788",
    instagram: "https://instagram.com/northbarber.ub",
    facebook: "https://facebook.com/northbarber.ub",
    cats: ["barber"],
    cover: IMG.interiors[7],
    plan: "PRO",
    ownerName: "Бат-Эрдэнэ",
    ownerEmail: "north@gereltuya.mn",
    sunday: "short",
    lat: 47.9221,
    lng: 106.9105,
    targetReviews: 112,
    staff: [
      { name: "Бат-Эрдэнэ", title: "Барбер", cats: ["barber"], years: 10, male: true, bio: "Фэйд засалт, сонгодог эрэгтэй засалтын мастер.", offDay: 0 },
      { name: "Түвшин", title: "Барбер", cats: ["barber"], years: 4, male: true, bio: "Орчин үеийн хэв маяг, сахал засалтаар мэргэшсэн.", offDay: 1 },
      { name: "Билгүүн", title: "Барбер", cats: ["barber"], years: 6, male: true, bio: "Хүүхдийн болон эрэгтэй засалт, тайван харилцаатай.", offDay: 3 },
    ],
  },
  {
    slug: "muse-beauty",
    name: "MUSE BEAUTY",
    tagline: "Нүүр будалт, хөмсөг, арьс арчилгаа",
    description:
      "MUSE BEAUTY нь нүүр будалт, хөмсөг, арьс арчилгааны мэргэжлийн баг. Хурим, зураг авалт, өдөр тутмын арчилгаанд тань бэлэн.",
    district: "Сүхбаатар дүүрэг",
    address: "Сүхбаатар дүүрэг, 8-р хороо, Энхтайвны өргөн чөлөө 15",
    phone: "9900 1122",
    instagram: "https://instagram.com/musebeauty.mn",
    cats: ["makeup", "brows", "skincare"],
    cover: IMG.interiors[11],
    plan: "BUSINESS",
    ownerName: "Энхжин",
    ownerEmail: "muse@gereltuya.mn",
    sunday: "short",
    lat: 47.9165,
    lng: 106.9235,
    targetReviews: 94,
    staff: [
      { name: "Энхжин", title: "Нүүр будалтын мастер", cats: ["makeup"], years: 11, bio: "Хурим, зураг авалтын нүүр будалтаар 11 жил ажиллаж байна.", offDay: 0 },
      { name: "Нандин", title: "Хөмсөгний мастер", cats: ["brows"], years: 6, bio: "Хөмсөг ламинаци, пудра тату хийдэг.", offDay: 1 },
      { name: "Гэрэлмаа", title: "Гоо засалч", cats: ["skincare"], years: 8, bio: "Арьсны төрөлд тохирсон арчилгааны хөтөлбөр гаргадаг.", offDay: 2 },
      { name: "Анужин", title: "Нүүр будалтын мастер", cats: ["makeup", "brows"], years: 4, bio: "Байгалийн өнгө аястай будалт, хөмсөг засалт.", offDay: 4 },
    ],
  },
  {
    slug: "sora-lash",
    name: "SORA LASH",
    tagline: "Сормуус, хөмсөгний студи",
    description:
      "SORA LASH нь сормуус, хөмсөгний үйлчилгээнд мэргэшсэн студи. Солонгос, Японы материал ашигладаг бөгөөд харшлын тест хийх боломжтой.",
    district: "Баянзүрх дүүрэг",
    address: "Баянзүрх дүүрэг, 26-р хороо, Их тойруу 52, 3 давхар",
    phone: "9555 3344",
    instagram: "https://instagram.com/soralash.ub",
    cats: ["lashes", "brows"],
    cover: IMG.interiors[2],
    plan: "PRO",
    ownerName: "Золзаяа",
    ownerEmail: "sora@gereltuya.mn",
    sunday: "closed",
    lat: 47.9185,
    lng: 106.9505,
    targetReviews: 73,
    staff: [
      { name: "Золзаяа", title: "Сормуусны мастер", cats: ["lashes"], years: 7, bio: "Хэмжээст сормуус, сормуус өргөлтийн сургагч багш.", offDay: 1 },
      { name: "Марал", title: "Сормуусны мастер", cats: ["lashes", "brows"], years: 3, bio: "Сонгодог суулгалт, хөмсөг будалт хийдэг.", offDay: 3 },
      { name: "Сэлэнгэ", title: "Хөмсөгний мастер", cats: ["brows"], years: 5, bio: "Хөмсөгний хэлбэр гаргалт, ламинацид мэргэшсэн.", offDay: 0 },
    ],
  },
  {
    slug: "atelier-hair",
    name: "ATELIER HAIR",
    tagline: "Үсний өнгө, засалтын ательe",
    description:
      "ATELIER HAIR нь үсний өнгө, засалтад төвлөрсөн ательe. Үсний эрүүл байдлыг хамгийн түрүүнд тавьж, өнгө бүрийг тань дээр тусгайлан холино.",
    district: "Хан-Уул дүүрэг",
    address: "Хан-Уул дүүрэг, 3-р хороо, Чингисийн өргөн чөлөө 24",
    phone: "8866 9900",
    instagram: "https://instagram.com/atelierhair.mn",
    website: "https://atelierhair.mn",
    cats: ["hair"],
    cover: IMG.interiors[5],
    plan: "PRO",
    ownerName: "Цэцэгээ",
    ownerEmail: "atelier@gereltuya.mn",
    sunday: "closed",
    lat: 47.9005,
    lng: 106.9125,
    targetReviews: 101,
    staff: [
      { name: "Цэцэгээ", title: "Өнгөний мастер", cats: ["hair"], years: 12, bio: "Балаяж, өнгө засварын мастер. Олон улсын сертификаттай.", offDay: 0 },
      { name: "Ганзориг", title: "Үсний стилист", cats: ["hair"], years: 8, male: true, bio: "Эрэгтэй, эмэгтэй засалт, богино үсний загвар.", offDay: 2 },
      { name: "Оюунаа", title: "Үсчин", cats: ["hair"], years: 4, bio: "Кератин эмчилгээ, баярын үс засалт хийдэг.", offDay: 4 },
    ],
  },
  {
    slug: "nude-studio",
    name: "NUDE STUDIO",
    tagline: "Хумс, арьс арчилгаа, тайвшрал",
    description:
      "NUDE STUDIO нь хумс, арьс арчилгаа, массажийг нэг дор санал болгодог тайван орон зай. Ажлын дараа өөртөө цаг гаргах хамгийн тохиромжтой газар.",
    district: "Баянгол дүүрэг",
    address: "Баянгол дүүрэг, 2-р хороо, Энхтайвны өргөн чөлөө 48",
    phone: "9944 2211",
    instagram: "https://instagram.com/nudestudio.mn",
    cats: ["nails", "skincare", "spa"],
    cover: IMG.interiors[3],
    plan: "PRO",
    ownerName: "Наран",
    ownerEmail: "nude@gereltuya.mn",
    sunday: "short",
    lat: 47.9145,
    lng: 106.8805,
    targetReviews: 67,
    staff: [
      { name: "Наран", title: "Маникюрист", cats: ["nails"], years: 7, bio: "Минимал хумсны дизайн, гелэн маникюр.", offDay: 1 },
      { name: "Хонгорзул", title: "Гоо засалч", cats: ["skincare"], years: 6, bio: "Нүүрний гүн цэвэрлэгээ, чийгшүүлэх арчилгаа.", offDay: 2 },
      { name: "Солонго", title: "Массажист", cats: ["spa"], years: 9, bio: "Бүтэн биеийн болон халуун чулуун массаж хийдэг.", offDay: 0 },
    ],
  },
  {
    slug: "selene-spa",
    name: "SELENE SPA",
    tagline: "Массаж, биеийн арчилгаа",
    description:
      "SELENE SPA нь хотын төвд байрлах тайвшралын төв. Бүтэн биеийн массаж, халуун чулуун массаж, хөлийн арчилгааг мэргэжлийн массажистууд хийнэ.",
    district: "Сүхбаатар дүүрэг",
    address: "Сүхбаатар дүүрэг, 1-р хороо, Олимпийн гудамж 7",
    phone: "7700 5566",
    instagram: "https://instagram.com/selenespa.mn",
    cats: ["spa", "skincare"],
    cover: IMG.interiors[9],
    plan: "BUSINESS",
    ownerName: "Төгөлдөр",
    ownerEmail: "selene@gereltuya.mn",
    sunday: "short",
    lat: 47.9105,
    lng: 106.9185,
    targetReviews: 58,
    staff: [
      { name: "Төгөлдөр", title: "Массажист", cats: ["spa"], years: 10, male: true, bio: "Спорт массаж, нуруу хүзүүний массажаар мэргэшсэн.", offDay: 0 },
      { name: "Оюун-Эрдэнэ", title: "Массажист", cats: ["spa"], years: 5, bio: "Тайвшруулах болон халуун чулуун массаж.", offDay: 3 },
      { name: "Мөнхцэцэг", title: "Гоо засалч", cats: ["skincare"], years: 6, bio: "Чийгшүүлэх болон гэрэлтүүлэх арчилгаа.", offDay: 5 },
    ],
  },
  {
    slug: "mira-aesthetic",
    name: "MIRA AESTHETIC",
    tagline: "Аппаратын гоо сайхан, арьс арчилгаа",
    description:
      "MIRA AESTHETIC нь орчин үеийн аппаратын арчилгаа, лазер үс авалт, арьс арчилгааны студи. Үйлчилгээ бүрийн өмнө үнэгүй зөвлөгөө өгнө.",
    district: "Хан-Уул дүүрэг",
    address: "Хан-Уул дүүрэг, 15-р хороо, Махатма Гандигийн гудамж 19",
    phone: "8899 0011",
    instagram: "https://instagram.com/mira.aesthetic",
    cats: ["aesthetic", "skincare"],
    cover: IMG.interiors[12],
    plan: "PRO",
    ownerName: "Хүслэн",
    ownerEmail: "mira@gereltuya.mn",
    sunday: "closed",
    lat: 47.8965,
    lng: 106.9025,
    targetReviews: 41,
    staff: [
      { name: "Хүслэн", title: "Гоо засалч", cats: ["aesthetic", "skincare"], years: 9, bio: "Аппаратын арчилгаа, микронидлингийн мэргэжилтэн.", offDay: 1 },
      { name: "Дөлгөөн", title: "Арьс арчилгааны мэргэжилтэн", cats: ["skincare", "aesthetic"], years: 4, bio: "Арьсны төрөл тодорхойлж, гэрийн арчилгааны зөвлөгөө өгдөг.", offDay: 4 },
    ],
  },
];

const FEMALE = [
  "Сарнай", "Ану", "Мөнхцэцэг", "Нарангэрэл", "Пүрэвсүрэн", "Отгонбаяр", "Энхтуяа", "Батцэцэг", "Ариунзаяа", "Мөнгөнзул",
  "Амин-Эрдэнэ", "Хишигдарь", "Цэлмэг", "Дэлгэрмаа", "Сэцэн", "Оюунбилэг", "Баярмаа", "Номин-Эрдэнэ", "Түмэнжаргал", "Ганцэцэг",
  "Индра", "Бүжинлхам", "Ундрах", "Мишээл", "Тэргэл", "Сондор", "Хонгор", "Энэрэл", "Од", "Гэгээ", "Мөнхжин", "Солонгоо",
];
const MALE = [
  "Тэмүүжин", "Ганбаатар", "Эрдэнэбат", "Мөнх-Оргил", "Билгүүн", "Бат-Очир", "Сүхбат", "Анхбаяр", "Төмөрбаатар", "Баасанжав",
  "Эрхэс", "Тэнгис", "Цогт", "Ариунболд", "Хангай", "Дөлгөөн", "Чинзориг", "Мандах",
];

const REVIEWS_5 = [
  "Маш сэтгэл хангалуун үлдлээ. Цагтаа эхэлсэн, үр дүн нь яг хүссэн шиг болсон.",
  "Орчин нь тайван, цэвэрхэн. Мастер маш анхааралтай, нарийн ажилладаг.",
  "Анх удаа ирсэн ч дахин ирнэ. Зөвлөгөө өгөхдөө маш ойлгомжтой тайлбарласан.",
  "Цаг захиалга хийхэд маш амархан байлаа. Хүлээлгүй шууд үйлчилгээ авлаа.",
  "Ажлын чанар үнэхээр сайн. Найз нартаа санал болгоно.",
  "Хоёр долоо хоног өнгөрсөн ч яг л анхны өдөр шиг харагдаж байна.",
  "Ээлтэй харилцаа, мэргэжлийн хандлага. Баярлалаа!",
  "Үнэ чанартаа тохирсон. Хамгийн гол нь найдвартай.",
];
const REVIEWS_4 = [
  "Үйлчилгээ сайн байсан, гэхдээ 10 минут хүлээсэн.",
  "Үр дүн таалагдсан. Зогсоолын асуудал бага зэрэг төвөгтэй.",
  "Ерөнхийдөө сайн. Дараагийн удаа өөр мастерт орж үзье гэж бодож байна.",
  "Чанартай ажилласан, үнэ арай өндөр санагдсан.",
];
const REVIEWS_3 = ["Дунд зэрэг. Хүлээсэн хугацаа урт байсан.", "Үр дүн муу биш, гэхдээ хүссэнээс арай өөр болсон."];

function phone(): string {
  const prefix = pick(["88", "99", "95", "80", "86", "94", "91", "89"]);
  return `${prefix}${int(10, 99)} ${int(1000, 9999)}`;
}

async function main() {
  console.log("Цэвэрлэж байна...");
  await db.$transaction([
    db.notification.deleteMany(),
    db.review.deleteMany(),
    db.favorite.deleteMany(),
    db.appointment.deleteMany(),
    db.customer.deleteMany(),
    db.blockedTime.deleteMany(),
    db.workingHour.deleteMany(),
    db.businessGallery.deleteMany(),
    db.payment.deleteMany(),
    db.subscription.deleteMany(),
    db.bookingRule.deleteMany(),
    db.service.deleteMany(),
    db.businessStaff.deleteMany(),
    db.business.deleteMany(),
    db.serviceCategory.deleteMany(),
    db.passwordResetToken.deleteMany(),
    db.user.deleteMany(),
    db.platformSetting.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();
  const today = ubStartOfDay(now);

  console.log("Ангилал...");
  const catIds: Record<CatKey, string> = {} as Record<CatKey, string>;
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.serviceCategory.create({
      data: { slug: c.slug, name: c.name, imageUrl: unsplash(IMG.categories[c.key], 800), sortOrder: i },
    });
    catIds[c.key] = row.id;
  }

  console.log("Хэрэглэгчид...");
  await db.user.create({
    data: { name: "Систем админ", email: "admin@gereltuya.mn", phone: "7011 0000", passwordHash, role: "ADMIN" },
  });
  const demoCustomer = await db.user.create({
    data: { name: "Сарнай", email: "customer@gereltuya.mn", phone: "9911 2345", passwordHash, role: "CUSTOMER", avatarUrl: unsplash(IMG.portraitsF[7], 300) },
  });

  // Registered customers who leave reviews and appear in CRM.
  const customerUsers = [demoCustomer];
  const usedPhones = new Set<string>(["9911 2345"]);
  const allNames = [...FEMALE.slice(1).map((n) => ({ n })), ...MALE.slice(0, 10).map((n) => ({ n }))];
  for (const [i, { n }] of allNames.entries()) {
    let p = phone();
    while (usedPhones.has(p)) p = phone();
    usedPhones.add(p);
    customerUsers.push(
      await db.user.create({ data: { name: n, email: `user${i + 1}@gereltuya.mn`, phone: p, passwordHash, role: "CUSTOMER" } }),
    );
  }

  await db.platformSetting.createMany({
    data: [
      { key: "platformName", value: "GERELTUYA" },
      { key: "supportEmail", value: "hello@gereltuya.mn" },
      { key: "supportPhone", value: "7700 1010" },
      { key: "autoApproveBusinesses", value: "true" },
    ],
  });

  let staffPortraitF = 0;
  let staffPortraitM = 0;
  let codeCounter = 1000;
  const nextCode = () => `GT${(codeCounter++).toString(36).toUpperCase()}${int(10, 99)}`;

  for (const [bi, biz] of BUSINESSES.entries()) {
    console.log(`Бизнес: ${biz.name}`);
    const owner = await db.user.create({
      data: { name: biz.ownerName, email: biz.ownerEmail, phone: biz.phone.replace(" ", "") === "88112233" ? "8811 0001" : `${biz.phone.slice(0, 2)}0${bi} ${int(1000, 9999)}`, passwordHash, role: "BUSINESS_OWNER" },
    });

    const business = await db.business.create({
      data: {
        slug: biz.slug,
        name: biz.name,
        tagline: biz.tagline,
        description: biz.description,
        district: biz.district,
        address: biz.address,
        phone: biz.phone,
        email: `hello@${biz.slug.replace("-", "")}.mn`,
        instagram: biz.instagram,
        facebook: biz.facebook,
        website: biz.website,
        coverUrl: unsplash(biz.cover, 1600),
        status: "ACTIVE",
        onboardingStep: 7,
        onboardingCompleted: true,
        ownerId: owner.id,
        lat: biz.lat,
        lng: biz.lng,
        createdAt: addDays(now, -int(200, 600)),
        categories: { connect: biz.cats.map((c) => ({ id: catIds[c] })) },
      },
    });

    await db.bookingRule.create({
      data: {
        businessId: business.id,
        minLeadMinutes: 60,
        maxAdvanceDays: 30,
        cancelWindowHours: 3,
        slotStepMin: 30,
        cancellationPolicy:
          "Захиалгаа эхлэхээс 3 цагийн өмнө хүртэл төлбөргүй цуцлах эсвэл цагаа өөрчлөх боломжтой. Хоцорвол үйлчилгээний хугацаа багасахыг анхаарна уу.",
      },
    });

    const sub = await db.subscription.create({
      data: { businessId: business.id, plan: biz.plan, status: "ACTIVE", currentPeriodEnd: addDays(today, int(5, 28)) },
    });
    const planPrice = biz.plan === "BUSINESS" ? 129_000 : biz.plan === "PRO" ? 49_000 : 0;
    for (let m = 5; m >= 0; m--) {
      const paidAt = addDays(now, -m * 30 - int(0, 3));
      await db.payment.create({
        data: { businessId: business.id, subscriptionId: sub.id, plan: biz.plan, amount: planPrice, status: "PAID", provider: "demo", providerRef: `demo_${biz.slug}_${m}`, createdAt: paidAt, paidAt },
      });
    }

    // Opening hours: Monday to Saturday 10:00 to 20:00, Sunday short or closed.
    for (let d = 0; d < 7; d++) {
      const sunday = d === 6;
      await db.workingHour.create({
        data: {
          businessId: business.id,
          weekday: d,
          openTime: sunday ? "11:00" : d === 5 ? "10:00" : "09:00",
          closeTime: sunday ? "18:00" : "20:00",
          isClosed: sunday && biz.sunday === "closed",
        },
      });
    }

    const services: { id: string; cat: CatKey; durationMin: number; price: number; name: string }[] = [];
    for (const cat of biz.cats) {
      const list = SERVICES[cat];
      for (const [si, s] of list.entries()) {
        const priceAdj = Math.round((s.price * (0.92 + rand() * 0.18)) / 1000) * 1000;
        const price = biz.slug === "noir-studio" && s.name === "Гелэн маникюр" ? 65_000 : priceAdj;
        const row = await db.service.create({
          data: { businessId: business.id, categoryId: catIds[cat], name: s.name, description: s.description, durationMin: s.durationMin, price, sortOrder: si },
        });
        services.push({ id: row.id, cat, durationMin: s.durationMin, price, name: s.name });
      }
    }

    const staffRows: { id: string; name: string; cats: CatKey[]; offDay?: number; serviceIds: string[] }[] = [];
    for (const [si, s] of biz.staff.entries()) {
      const photo = s.male ? IMG.portraitsM[staffPortraitM++ % IMG.portraitsM.length] : IMG.portraitsF[staffPortraitF++ % IMG.portraitsF.length];
      const serviceIds = services.filter((x) => s.cats.includes(x.cat)).map((x) => x.id);
      let userId: string | undefined;
      if (biz.slug === "noir-studio" && s.name === "Саруул") {
        const staffUser = await db.user.create({
          data: { name: "Саруул", email: "staff@gereltuya.mn", phone: "8822 3344", passwordHash, role: "STAFF", avatarUrl: unsplash(photo, 300) },
        });
        userId = staffUser.id;
      }
      const row = await db.businessStaff.create({
        data: {
          businessId: business.id,
          userId,
          name: s.name,
          title: s.title,
          bio: s.bio,
          experienceYears: s.years,
          photoUrl: unsplash(photo, 600),
          sortOrder: si,
          color: ["#8e4f36", "#5b6b5a", "#6b5a7a", "#a07a3d", "#4f6475"][si % 5],
          services: { connect: serviceIds.map((id) => ({ id })) },
        },
      });
      staffRows.push({ id: row.id, name: s.name, cats: s.cats, offDay: s.offDay, serviceIds });
      if (s.offDay !== undefined && s.offDay !== 6) {
        await db.workingHour.create({
          data: { businessId: business.id, staffId: row.id, weekday: s.offDay, openTime: "10:00", closeTime: "19:00", isClosed: true },
        });
      }
      // Lunch break on weekdays for a few specialists.
      if (si % 2 === 0) {
        for (let d = 0; d < 5; d++) {
          if (d === s.offDay) continue;
          await db.workingHour.create({
            data: { businessId: business.id, staffId: row.id, weekday: d, openTime: "09:00", closeTime: "20:00", breakStart: "13:00", breakEnd: "14:00" },
          });
        }
      }
    }

    // Gallery.
    const galleryPool = [biz.cover, ...IMG.interiors.filter((x) => x !== biz.cover)].slice(0, 6);
    await db.businessGallery.createMany({
      data: galleryPool.map((id, i) => ({ businessId: business.id, imageUrl: unsplash(id, 1000), sortOrder: i, caption: "" })),
    });

    // CRM customers: some registered users, some walk-in.
    const crm: { id: string; userId: string | null }[] = [];
    const regCount = Math.min(customerUsers.length, 14 + int(0, 10));
    const regUsers = [demoCustomer, ...customerUsers.slice(1).sort(() => rand() - 0.5).slice(0, regCount - 1)];
    for (const u of regUsers) {
      const c = await db.customer.create({
        data: { businessId: business.id, userId: u.id, name: u.name, phone: u.phone ?? phone(), email: u.email, createdAt: addDays(now, -int(30, 200)) },
      });
      crm.push({ id: c.id, userId: u.id });
    }
    const walkIns = 140 + int(0, 60);
    const crmPhones = new Set<string>();
    for (let i = 0; i < walkIns; i++) {
      const male = biz.slug === "north-barber" ? chance(0.9) : chance(0.15);
      const name = male ? pick(MALE) : pick(FEMALE.slice(1));
      let p = phone();
      while (crmPhones.has(p) || usedPhones.has(p)) p = phone();
      crmPhones.add(p);
      const c = await db.customer.create({ data: { businessId: business.id, name, phone: p, createdAt: addDays(now, -int(1, 150)) } });
      crm.push({ id: c.id, userId: null });
    }
    const sarnai = crm[0];
    const unused = crm.slice(regUsers.length).sort(() => rand() - 0.5);
    const pool = crm.slice(0, regUsers.length);

    // Appointments: 120 days back, 21 days ahead. Fill each specialist day to a realistic level.
    const appts: {
      code: string; businessId: string; serviceId: string; staffId: string; customerId: string; userId: string | null;
      startAt: Date; endAt: Date; price: number; status: AppointmentStatus; source: "ONLINE" | "MANUAL"; createdAt: Date;
    }[] = [];
    const busy = new Map<string, [number, number][]>();
    const reserve = (staffId: string, start: Date, end: Date) => {
      const list = busy.get(staffId) ?? [];
      if (list.some(([s, e]) => start.getTime() < e && end.getTime() > s)) return false;
      list.push([start.getTime(), end.getTime()]);
      busy.set(staffId, list);
      return true;
    };

    const pushAppt = (args: { serviceId: string; staffId: string; customer: { id: string; userId: string | null }; start: Date; status?: AppointmentStatus }) => {
      const svc = services.find((s) => s.id === args.serviceId)!;
      const end = addMinutes(args.start, svc.durationMin);
      if (!reserve(args.staffId, args.start, end)) return false;
      let status: AppointmentStatus;
      if (args.status) status = args.status;
      else if (end < now) {
        const r = rand();
        status = r < 0.86 ? "COMPLETED" : r < 0.95 ? "CANCELLED" : "NO_SHOW";
      } else status = chance(0.86) ? "CONFIRMED" : "PENDING";
      appts.push({
        code: nextCode(),
        businessId: business.id,
        serviceId: svc.id,
        staffId: args.staffId,
        customerId: args.customer.id,
        userId: args.customer.userId,
        startAt: args.start,
        endAt: end,
        price: svc.price,
        status,
        source: chance(0.78) ? "ONLINE" : "MANUAL",
        createdAt: addDays(args.start, -int(1, 10)),
      });
      return true;
    };

    // Signature demo appointments for NOIR STUDIO.
    if (biz.slug === "noir-studio") {
      const st = (n: string) => staffRows.find((s) => s.name === n)!;
      const sv = (n: string) => services.find((s) => s.name === n)!;
      const p = ubParts(today);
      const todayAt = (h: number, m: number) => ubDate(p.year, p.month, p.day, h, m);
      pushAppt({ serviceId: sv("Маникюр").id, staffId: st("Саруул").id, customer: crm[3], start: todayAt(9, 30) });
      pushAppt({ serviceId: sv("Үс засалт").id, staffId: st("Ариунаа").id, customer: crm[5], start: todayAt(11, 0) });
      pushAppt({ serviceId: sv("Сормуус өргөлт").id, staffId: st("Номин").id, customer: crm[8], start: todayAt(13, 30) });
      pushAppt({ serviceId: sv("Гелэн педикюр").id, staffId: st("Мөнхзул").id, customer: crm[11], start: todayAt(16, 0) });
      pushAppt({ serviceId: sv("Кератин эмчилгээ").id, staffId: st("Тэмүүлэн").id, customer: crm[14], start: todayAt(14, 0) });
      // Sarnai: 17 past visits and one upcoming booking tomorrow at 15:30.
      const sarnaiServices = ["Гелэн маникюр", "Гелэн маникюр", "Үс засалт", "Сормуус засвар", "Үс будалт (нэг өнгө)", "Гелэн педикюр"];
      let placed = 0;
      for (let k = 0; placed < 17 && k < 80; k++) {
        const daysBack = 2 + placed * 7 + (k % 3);
        const day = addDays(today, -daysBack);
        const dp = ubParts(day);
        const svc = sv(sarnaiServices[placed % sarnaiServices.length]);
        const staff = staffRows.find((s) => s.serviceIds.includes(svc.id) && s.offDay !== dp.weekday)!;
        if (!staff) continue;
        const ok = pushAppt({ serviceId: svc.id, staffId: staff.id, customer: sarnai, start: ubDate(dp.year, dp.month, dp.day, 15, 0), status: "COMPLETED" });
        if (ok) placed++;
      }
      const tomorrow = addDays(today, 1);
      const tp = ubParts(tomorrow);
      pushAppt({ serviceId: sv("Гелэн маникюр").id, staffId: st("Саруул").id, customer: sarnai, start: ubDate(tp.year, tp.month, tp.day, 15, 30), status: "CONFIRMED" });
    }

    const hours = await db.workingHour.findMany({ where: { businessId: business.id } });
    for (let offset = -120; offset <= 21; offset++) {
      const day = addDays(today, offset);
      const dp = ubParts(day);
      const bizDay = hours.find((h) => h.staffId === null && h.weekday === dp.weekday)!;
      if (bizDay.isClosed) continue;
      const weekend = dp.weekday >= 4;
      const growth = 0.75 + ((offset + 120) / 141) * 0.35; // business grows over time
      for (const staff of staffRows) {
        if (staff.offDay === dp.weekday) continue;
        const own = hours.find((h) => h.staffId === staff.id && h.weekday === dp.weekday);
        const openM = hhmmToMinutes((own ?? bizDay).openTime);
        const closeM = hhmmToMinutes((own ?? bizDay).closeTime);
        const future = offset > 0;
        const fill = (future ? Math.max(0.12, 0.55 - offset * 0.03) : weekend ? 0.68 : 0.52) * growth;
        let cursor = openM + (chance(0.5) ? 0 : 30);
        while (cursor < closeM - 30) {
          const svcId = pick(staff.serviceIds);
          const svc = services.find((s) => s.id === svcId)!;
          if (cursor + svc.durationMin > closeM) break;
          if (own?.breakStart && cursor < hhmmToMinutes(own.breakEnd!) && cursor + svc.durationMin > hhmmToMinutes(own.breakStart)) {
            cursor = hhmmToMinutes(own.breakEnd!);
            continue;
          }
          // Peak hours: late afternoon is busier.
          const peakBoost = cursor >= 15 * 60 && cursor <= 18 * 60 ? 0.18 : cursor < 11 * 60 ? -0.15 : 0;
          if (chance(fill + peakBoost)) {
            let customer: { id: string; userId: string | null };
            if (unused.length && chance(0.22)) {
              customer = unused.pop()!;
              pool.push(customer);
            } else customer = chance(0.35) ? pick(crm.slice(0, regUsers.length)) : pick(pool);
            const start = addMinutes(day, cursor);
            if (offset === 0 && biz.slug === "noir-studio") {
              // today's NOIR schedule is fixed above so the demo reads like the brief
              cursor += 30;
              continue;
            }
            if (pushAppt({ serviceId: svc.id, staffId: staff.id, customer, start })) {
              cursor += svc.durationMin + (chance(0.4) ? 30 : 0);
              continue;
            }
          }
          cursor += 30;
        }
      }
    }

    // Cancellation reasons for cancelled visits.
    const created = await db.$transaction(
      appts.map((a) =>
        db.appointment.create({
          data: { ...a, cancelReason: a.status === "CANCELLED" ? pick(["Цаг тохирохгүй болсон", "Өвдсөн", "Ажил гарсан", "Өөр цагт шилжүүлнэ"]) : null },
        }),
      ),
    );
    console.log(`  ${created.length} захиалга`);

    // Reviews from completed visits of registered customers.
    const completedReg = created.filter((a) => a.status === "COMPLETED" && a.userId).sort(() => rand() - 0.5);
    const reviewTarget = Math.min(biz.targetReviews, completedReg.length);
    const reviewRows = completedReg.slice(0, reviewTarget).map((a) => {
      const r = rand();
      const rating = r < 0.86 ? 5 : r < 0.97 ? 4 : 3;
      return {
        businessId: business.id,
        staffId: a.staffId,
        appointmentId: a.id,
        userId: a.userId!,
        rating,
        comment: rating === 5 ? pick(REVIEWS_5) : rating === 4 ? pick(REVIEWS_4) : pick(REVIEWS_3),
        status: chance(0.02) ? ("FLAGGED" as const) : ("VISIBLE" as const),
        createdAt: addMinutes(a.endAt, int(60, 60 * 48)),
      };
    });
    if (reviewRows.length) await db.review.createMany({ data: reviewRows });

    const visible = reviewRows.filter((r) => r.status === "VISIBLE");
    const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;
    await db.business.update({ where: { id: business.id }, data: { ratingAvg: Math.round(avg * 10) / 10, reviewCount: visible.length } });
    for (const s of staffRows) {
      const mine = visible.filter((r) => r.staffId === s.id);
      const sAvg = mine.length ? mine.reduce((x, r) => x + r.rating, 0) / mine.length : 0;
      await db.businessStaff.update({ where: { id: s.id }, data: { ratingAvg: Math.round(sAvg * 10) / 10, reviewCount: mine.length } });
    }

    // Blocked time example: team training next week.
    const training = addDays(today, 6);
    const tp = ubParts(training);
    await db.blockedTime.create({
      data: { businessId: business.id, staffId: staffRows[0].id, startAt: ubDate(tp.year, tp.month, tp.day, 9, 0), endAt: ubDate(tp.year, tp.month, tp.day, 11, 0), reason: "Сургалт" },
    });

    // Owner notifications.
    const recentOnline = created.filter((a) => a.source === "ONLINE" && a.startAt > now).slice(0, 4);
    for (const [i, a] of recentOnline.entries()) {
      const c = await db.customer.findUnique({ where: { id: a.customerId } });
      await db.notification.create({
        data: {
          userId: owner.id,
          type: i % 2 === 0 ? "NEW_BOOKING" : "BOOKING_CONFIRMED",
          title: i % 2 === 0 ? "Шинэ захиалга ирлээ." : "Захиалга баталгаажлаа",
          body:
            i % 2 === 0
              ? `${c?.name ?? "Үйлчлүүлэгч"} ${services.find((s) => s.id === a.serviceId)?.name ?? ""} захиаллаа.`
              : `${c?.name ?? "Үйлчлүүлэгч"} ${String(ubParts(a.startAt).hour).padStart(2, "0")}:${String(ubParts(a.startAt).minute).padStart(2, "0")} цагийн захиалгаа баталгаажууллаа.`,
          link: "/owner/appointments",
          createdAt: addMinutes(now, -int(10, 600)),
          readAt: i > 1 ? now : null,
        },
      });
    }
  }

  // Featured "Сарнай 15:30" owner notification exactly like the brief.
  const noirOwner = await db.user.findUnique({ where: { email: "owner@gereltuya.mn" } });
  if (noirOwner) {
    await db.notification.create({
      data: { userId: noirOwner.id, type: "BOOKING_CONFIRMED", title: "Захиалга баталгаажлаа", body: "Сарнай 15:30 цагийн захиалгаа баталгаажууллаа.", link: "/owner/appointments", createdAt: addMinutes(now, -5) },
    });
  }

  // Customer notifications.
  const sarnaiNext = await db.appointment.findFirst({ where: { userId: demoCustomer.id, startAt: { gt: now } }, orderBy: { startAt: "asc" } });
  await db.notification.createMany({
    data: [
      {
        userId: demoCustomer.id,
        type: "REMINDER_24H",
        title: "Захиалгын сануулга",
        body: "Таны захиалга маргааш 15:30 цагт байна. NOIR STUDIO, Гелэн маникюр.",
        link: sarnaiNext ? `/app/bookings/${sarnaiNext.id}` : "/app/bookings",
        dedupeKey: sarnaiNext ? `reminder24h:${sarnaiNext.id}` : null,
        createdAt: addMinutes(now, -30),
      },
      {
        userId: demoCustomer.id,
        type: "PROMO",
        title: "Шинэ үйлчилгээ",
        body: "LUNA NAIL хумсны дизайны шинэ цуглуулгаа танилцууллаа.",
        link: "/b/luna-nail",
        createdAt: addDays(now, -2),
        readAt: addDays(now, -1),
      },
    ],
  });

  // Favorites for the demo customer.
  const fav = await db.business.findMany({ where: { slug: { in: ["noir-studio", "luna-nail", "sora-lash"] } } });
  for (const b of fav) await db.favorite.create({ data: { userId: demoCustomer.id, businessId: b.id } });
  const favStaff = await db.businessStaff.findFirst({ where: { name: "Саруул" } });
  if (favStaff) await db.favorite.create({ data: { userId: demoCustomer.id, staffId: favStaff.id } });

  // Two new businesses waiting for admin approval.
  for (const p of [
    { slug: "zaya-brow-bar", name: "ZAYA BROW BAR", owner: "Заяа", email: "zaya@gereltuya.mn", district: "Баянгол дүүрэг", cat: "brows" as CatKey },
    { slug: "khan-barber-club", name: "KHAN BARBER CLUB", owner: "Хаан", email: "khan@gereltuya.mn", district: "Сонгинохайрхан дүүрэг", cat: "barber" as CatKey },
  ]) {
    const o = await db.user.create({ data: { name: p.owner, email: p.email, passwordHash, role: "BUSINESS_OWNER" } });
    const b = await db.business.create({
      data: {
        slug: p.slug,
        name: p.name,
        description: "Шинээр бүртгүүлсэн бизнес. Админы баталгаажуулалт хүлээж байна.",
        district: p.district,
        address: `${p.district}, 5-р хороо`,
        phone: phone(),
        status: "PENDING",
        onboardingStep: 7,
        onboardingCompleted: true,
        ownerId: o.id,
        createdAt: addDays(now, -int(0, 3)),
        categories: { connect: [{ id: catIds[p.cat] }] },
      },
    });
    await db.subscription.create({ data: { businessId: b.id, plan: "PRO", status: "TRIAL", currentPeriodEnd: addDays(now, 14) } });
    await db.bookingRule.create({ data: { businessId: b.id } });
  }

  const counts = {
    users: await db.user.count(),
    businesses: await db.business.count(),
    appointments: await db.appointment.count(),
    reviews: await db.review.count(),
  };
  console.log("Бэлэн:", counts);
  console.log(`Демо нууц үг: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
