import type { Plan } from "@prisma/client";

export type PlanDefinition = {
  id: Plan;
  name: string;
  price: number;
  description: string;
  features: string[];
  limits: { services: number; staff: number; locations: number };
  modules: { crm: boolean; analytics: boolean; notifications: boolean; advancedReports: boolean };
};

export const PLANS: Record<Plan, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "FREE",
    price: 0,
    description: "Ганцаараа ажилладаг мэргэжилтэнд эхлэхэд тохиромжтой.",
    features: ["Бизнесийн үндсэн профайл", "5 хүртэлх үйлчилгээ", "Онлайн цаг захиалга", "1 мэргэжилтэн"],
    limits: { services: 5, staff: 1, locations: 1 },
    modules: { crm: false, analytics: false, notifications: false, advancedReports: false },
  },
  PRO: {
    id: "PRO",
    name: "PRO",
    price: 49_000,
    description: "Өсөж буй салон, студид зориулсан бүрэн удирдлага.",
    features: [
      "Хязгааргүй үйлчилгээ",
      "Мэргэжилтний удирдлага",
      "Үйлчлүүлэгчийн бүртгэл (CRM)",
      "Орлогын тайлан, статистик",
      "Мэдэгдэл, сануулга",
    ],
    limits: { services: Infinity, staff: 15, locations: 1 },
    modules: { crm: true, analytics: true, notifications: true, advancedReports: false },
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "BUSINESS",
    price: 129_000,
    description: "Олон салбартай, том багтай бизнест.",
    features: [
      "PRO багцын бүх боломж",
      "Олон салбар",
      "Нарийвчилсан статистик",
      "Ажилтны эрхийн тохиргоо",
      "Тэргүүн ээлжийн тусламж",
      "Өргөтгөсөн тайлан",
    ],
    limits: { services: Infinity, staff: Infinity, locations: 10 },
    modules: { crm: true, analytics: true, notifications: true, advancedReports: true },
  },
};

export const TRIAL_DAYS = 14;

export function effectivePlan(sub: { plan: Plan; status: string; currentPeriodEnd: Date | null } | null): Plan {
  if (!sub) return "FREE";
  if (sub.status === "CANCELLED" || sub.status === "PAST_DUE") return "FREE";
  if (sub.status === "TRIAL" && sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return "FREE";
  return sub.plan;
}
