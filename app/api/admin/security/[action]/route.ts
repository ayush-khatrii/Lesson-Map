import { adminEndpoint } from "@/lib/admin/http";
import { securityAction, securityStatus } from "@/lib/admin/security";

type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, context: Context) {
  const { action } = await context.params;
  return adminEndpoint(
    async (_request, admin) => {
      if (action !== "status")
        throw new (await import("@/lib/admin/guard")).AdminError(
          404,
          "NOT_FOUND",
          "Not found.",
        );
      return securityStatus(admin);
    },
    { verified: false },
  )(request);
}
export async function POST(request: Request, context: Context) {
  const { action } = await context.params;
  return adminEndpoint((req, admin) => securityAction(action, req, admin), {
    verified: false,
  })(request);
}
