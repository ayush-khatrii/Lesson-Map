import { adminEndpoint, throttle } from "@/lib/admin/http";
import { overviewData } from "@/lib/admin/data";
import { billingReport } from "@/lib/admin/billing";
import { reportRange } from "@/lib/admin/filters";
export const maxDuration = 60;
export const GET = adminEndpoint(async (request, admin) => {
  const params = new URL(request.url).searchParams;
  if (params.get("refresh") === "true")
    await throttle(`refresh:${admin.user.id}`, 6);
  const [app, billing] = await Promise.all([
    overviewData(reportRange(params)),
    billingReport(params),
  ]);
  return { ...app, billing };
});
