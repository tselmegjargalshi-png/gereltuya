import "server-only";
import { requireOwnerBusiness } from "@/lib/auth/session";
import { effectivePlan, PLANS } from "@/lib/plans";

export async function ownerCtx() {
  const { user, business } = await requireOwnerBusiness();
  const plan = effectivePlan(business.subscription);
  return { user, business, plan, limits: PLANS[plan].limits, modules: PLANS[plan].modules };
}

export const tooMany = (what: string, plan: string) =>
  `${plan} багцад ${what} хязгаартай байна. Нэмэхийн тулд багцаа ахиулна уу.`;
