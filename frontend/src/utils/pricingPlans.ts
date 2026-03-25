/**
 * Standard course pricing (same for all paid courses).
 * Keep in sync with backend `App\Config\PricingPlans.php`.
 */
export type PlanCode = '3m_no_diet' | '3m_diet' | '1y_no_diet' | '1y_diet';

export interface CoursePricingPlan {
  code: PlanCode;
  title: string;
  option: string;
  amount: number;
}

export const COURSE_PRICING_PLANS: CoursePricingPlan[] = [
  { code: '3m_no_diet', title: '3-Month Plan', option: 'Without diet', amount: 3000 },
  { code: '3m_diet', title: '3-Month Plan', option: 'With diet', amount: 3500 },
  { code: '1y_no_diet', title: '1-Year Plan', option: 'Without diet', amount: 5000 },
  { code: '1y_diet', title: '1-Year Plan', option: 'With diet', amount: 5500 },
];

export const DEFAULT_PLAN_CODE: PlanCode = '3m_no_diet';

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

/** Group plans by title for display (3-Month / 1-Year). */
export function groupedPricingPlans(): { title: string; plans: CoursePricingPlan[] }[] {
  const titles = ['3-Month Plan', '1-Year Plan'] as const;
  return titles.map((title) => ({
    title,
    plans: COURSE_PRICING_PLANS.filter((p) => p.title === title),
  }));
}
