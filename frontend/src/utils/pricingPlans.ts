/**
 * Standard course pricing (same for all paid courses).
 * Keep in sync with backend `App\Config\PricingPlans.php`.
 */
export type PlanCode = '1y_no_diet' | '1y_diet';

export interface CoursePricingPlan {
  code: PlanCode;
  title: string;
  option: string;
  amount: number;
}

export const COURSE_PRICING_PLANS: CoursePricingPlan[] = [
  { code: '1y_no_diet', title: '1-Year Plan', option: 'Without diet', amount: 3000 },
  { code: '1y_diet', title: '1-Year Plan', option: 'With diet', amount: 4000 },
];

export const DEFAULT_PLAN_CODE: PlanCode = '1y_no_diet';

export function minPlanPrice(): number {
  return Math.min(...COURSE_PRICING_PLANS.map((p) => p.amount));
}

export function getPlanByCode(code: PlanCode): CoursePricingPlan {
  const found = COURSE_PRICING_PLANS.find((p) => p.code === code);
  if (!found) {
    return COURSE_PRICING_PLANS[0];
  }
  return found;
}

/** Group plans for display (single 1-year tier). */
export function groupedPricingPlans(): { title: string; plans: CoursePricingPlan[] }[] {
  return [{ title: '1-Year Plan', plans: [...COURSE_PRICING_PLANS] }];
}
