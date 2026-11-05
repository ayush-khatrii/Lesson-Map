import { requireAdminPage } from "@/lib/admin/guard";
import { AdminSettings } from "@/components/admin/AdminSettings";
export default async function AdminSettingsPage() {
  await requireAdminPage();
  return <AdminSettings />;
}
