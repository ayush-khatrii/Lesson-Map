import { requireAdminPage } from "@/lib/admin/guard";
import { RevenueView } from "@/components/admin/RevenueView";
export default async function RevenuePage() {
  await requireAdminPage();
  return <RevenueView />;
}
