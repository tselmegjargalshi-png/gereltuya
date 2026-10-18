import type { AppointmentStatus, Plan, ReviewStatus, Role, BusinessStatus } from "@prisma/client";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Хүлээгдэж байна",
  CONFIRMED: "Баталгаажсан",
  COMPLETED: "Дууссан",
  CANCELLED: "Цуцлагдсан",
  NO_SHOW: "Ирээгүй",
};

export const STATUS_TONE: Record<AppointmentStatus, "warning" | "success" | "neutral" | "danger" | "accent"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
  NO_SHOW: "danger",
};

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: "Үйлчлүүлэгч",
  BUSINESS_OWNER: "Бизнес эзэмшигч",
  STAFF: "Мэргэжилтэн",
  ADMIN: "Админ",
};

export const BUSINESS_STATUS_LABEL: Record<BusinessStatus, string> = {
  PENDING: "Хүлээгдэж буй",
  ACTIVE: "Идэвхтэй",
  SUSPENDED: "Түр хаасан",
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  VISIBLE: "Харагдаж байна",
  HIDDEN: "Нуусан",
  FLAGGED: "Шалгах шаардлагатай",
};

export const PLAN_LABEL: Record<Plan, string> = { FREE: "FREE", PRO: "PRO", BUSINESS: "BUSINESS" };

export const SORT_OPTIONS = [
  { value: "nearest", label: "Хамгийн ойр" },
  { value: "rating", label: "Өндөр үнэлгээтэй" },
  { value: "price_asc", label: "Үнэ бага" },
  { value: "price_desc", label: "Үнэ өндөр" },
  { value: "popular", label: "Хамгийн их захиалгатай" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export const MESSAGES = {
  loadError: "Мэдээлэл ачааллахад алдаа гарлаа.",
  retry: "Дахин оролдоно уу.",
  serviceUnavailable: "Энэ үйлчилгээ одоогоор захиалга авах боломжгүй байна.",
  bookingFailed: "Таны захиалгыг баталгаажуулж чадсангүй.",
  slotTaken: "Уучлаарай, энэ цаг дөнгөж сая захиалагдлаа. Өөр цаг сонгоно уу.",
  unauthorized: "Энэ үйлдлийг хийх эрх танд байхгүй байна.",
  saved: "Өөрчлөлт хадгалагдлаа.",
  required: "Энэ талбарыг бөглөнө үү.",
} as const;
