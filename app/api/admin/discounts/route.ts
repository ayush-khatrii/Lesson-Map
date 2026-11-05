import { adminEndpoint, readJson } from "@/lib/admin/http";
import { listDiscounts, mutateDiscount } from "@/lib/admin/discounts";
export const maxDuration = 60;
export const GET = adminEndpoint(async () => listDiscounts());
export const POST = adminEndpoint(
  async (request, admin) =>
    mutateDiscount(admin.user.id, await readJson(request)),
  { fresh: true },
);
