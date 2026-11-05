import { adminEndpoint } from "@/lib/admin/http";
import { readAdminReport } from "@/lib/admin/report-cache";
export const GET = adminEndpoint(async (request) =>
  readAdminReport("users", new URL(request.url).searchParams),
);
