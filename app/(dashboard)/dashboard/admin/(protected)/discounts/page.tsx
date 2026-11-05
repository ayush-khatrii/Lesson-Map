import { requireAdminPage } from "@/lib/admin/guard";
import { DiscountsView } from "@/components/admin/DiscountsView";
export default async function DiscountsPage() {
  await requireAdminPage();
  return <DiscountsView />;
}
