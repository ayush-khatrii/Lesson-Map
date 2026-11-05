export type UserRow = {
  id: string;
  name: string;
  email: string;
  courses: number;
  modules: number;
  lessons: number;
  publishedCourses: number;
  isPaid: boolean;
  isActive: boolean;
  cancelling: boolean;
  emailVerified: boolean;
  isFree: boolean;
  isCreator: boolean;
  isProfessional: boolean;
  accountAgeDays: number;
};
export type ContentRow = {
  id: string;
  courseName: string;
  name: string;
  email: string;
  isPublic: boolean;
  isPublished: boolean;
  modules: number;
  lessons: number;
  createdAt: string;
};
export type Paged<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type PaymentRow = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  plan: "CREATOR" | "PROFESSIONAL";
  amount: number;
  currency: string;
  status: string;
};
export type RefundRow = {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  plan: "CREATOR" | "PROFESSIONAL";
};
export type BillingDataset = { payments: PaymentRow[]; refunds: RefundRow[] };
export type FinancialPeriod = {
  gross: number;
  refunds: number;
  net: number;
  succeeded: number;
  failed: number;
  successRate: number;
  averagePayment: number;
};
export type BillingReport = {
  available: boolean;
  stale: boolean;
  fetchedAt: string | null;
  error?: string;
  currency: string;
  currencies: string[];
  current: FinancialPeriod | null;
  previous: FinancialPeriod | null;
  trend: { date: string; collected: number; refunded: number }[];
  byPlan: { name: string; collected: number }[];
  payments: Paged<PaymentRow>;
  range: { from: string; to: string };
};
export type OverviewReport = {
  totals: {
    users: number;
    courses: number;
    modules: number;
    lessons: number;
    paid: number;
    free: number;
    creator: number;
    professional: number;
    cancelling: number;
    withCourses: number;
  };
  signups: {
    current: number;
    previous: number | null;
    trend: { date: string; users: number }[];
  };
  billing: BillingReport;
};
export type DiscountRow = {
  id: string;
  name: string;
  code: string;
  percentage: number;
  plans: string[];
  startsAt: string | null;
  expiresAt: string | null;
  timesUsed: number;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  cycles: number | null;
  eligibility: "any" | "first_time" | "existing";
  preserveOnPlanChange: boolean;
  state: "scheduled" | "active" | "expired" | "exhausted";
  editable: boolean;
};
