import { requireAdminPage } from "@/lib/admin/guard";
import { ContentView } from "@/components/admin/ContentView";
export default async function ContentPage() {
  await requireAdminPage();
  return <ContentView />;
}
