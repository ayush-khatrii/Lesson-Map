import { adminEndpoint, throttle } from "@/lib/admin/http";
import { billingReport } from "@/lib/admin/billing";
export const maxDuration = 60;
export const GET = adminEndpoint(async (request, admin) => {
  const params = new URL(request.url).searchParams;
  if (params.get("refresh") === "true")
    await throttle(`refresh:${admin.user.id}`, 6);
  return billingReport(params);
});
