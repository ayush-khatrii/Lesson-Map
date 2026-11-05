import { adminEndpoint } from "@/lib/admin/http";
export const POST = adminEndpoint(async () => ({ ok: true }));
