import { AdminLogin } from "@/components/admin/AdminLogin";
import { connection } from "next/server";
export default async function AdminLoginPage() {
  await connection();
  return (
    <AdminLogin
      configured={Boolean(
        process.env.ADMIN_AUTH_SECRET?.trim() &&
        process.env.ADMIN_TOTP_ENCRYPTION_KEY?.trim(),
      )}
      googleConfigured={Boolean(
        process.env.GOOGLE_CLIENT_ID?.trim() &&
        process.env.GOOGLE_CLIENT_SECRET?.trim(),
      )}
    />
  );
}
