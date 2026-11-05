import { requireAdminPage } from "@/lib/admin/guard";
import { UsersView } from "@/components/admin/UsersView";
export default async function UsersPage() {
  await requireAdminPage();
  return <UsersView />;
}
