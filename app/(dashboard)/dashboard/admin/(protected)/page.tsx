import { requireAdminPage } from "@/lib/admin/guard";
import { BusinessOverview } from "@/components/admin/BusinessOverview";
export default async function OverviewPage() {
  await requireAdminPage();
  return <BusinessOverview />;
}
