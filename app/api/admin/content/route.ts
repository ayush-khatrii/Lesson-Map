import { adminEndpoint } from "@/lib/admin/http";
import { contentData } from "@/lib/admin/data";
export const GET = adminEndpoint(async (request) =>
  contentData(new URL(request.url).searchParams),
);
