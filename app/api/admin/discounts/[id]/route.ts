import { adminEndpoint, readJson } from "@/lib/admin/http";
import { mutateDiscount } from "@/lib/admin/discounts";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return adminEndpoint(
    async (req, admin) =>
      mutateDiscount(admin.user.id, await readJson(req), id),
    { fresh: true },
  )(request);
}
