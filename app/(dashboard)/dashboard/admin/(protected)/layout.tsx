import { requireAdminPage } from "@/lib/admin/guard";
import { AdminShell } from "@/components/admin/AdminShell";
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdminPage();
  return (
    <AdminShell
      user={{
        id: admin.user.id,
        name: admin.user.name,
        email: admin.user.email,
        role: admin.access.role,
      }}
    >
      {children}
    </AdminShell>
  );
}
