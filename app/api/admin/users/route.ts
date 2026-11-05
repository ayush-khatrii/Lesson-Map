import { adminEndpoint } from "@/lib/admin/http";
import { usersData } from "@/lib/admin/data";
export const GET = adminEndpoint(async (request) =>
  usersData(new URL(request.url).searchParams),
);
