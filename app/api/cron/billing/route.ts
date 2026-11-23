import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processBillingCycles } from "@/lib/payments/billing-cycle";
import { deliverBillingEmails } from "@/lib/payments/billing-email";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Billing job is not configured" },
      { status: 503 },
    );
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const deadline = Date.now() + 270_000;
    const cycles = await processBillingCycles();
    const delivery = { sent: 0, failed: 0 };
    while (Date.now() < deadline - 30_000) {
      const batch = await deliverBillingEmails(
        undefined,
        deadline - Date.now(),
      );
      delivery.sent += batch.sent;
      delivery.failed += batch.failed;
      if (batch.handled < 25) break;
    }
    return NextResponse.json(
      { ...cycles, ...delivery },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Billing job failed");
    return NextResponse.json({ error: "Billing job failed" }, { status: 500 });
  }
}
