import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { cancelExpiredUnpaidOrders } from "@/services/order-lifecycle.service";

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = req.headers.get("authorization");
  const session = await getSession();

  const authorizedByCron =
    Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
  const authorizedByOwner = session?.role === "OWNER" || session?.role === "ADMIN";

  if (!authorizedByCron && !authorizedByOwner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cancelledCount = await cancelExpiredUnpaidOrders();
  return NextResponse.json({ ok: true, cancelledCount });
}
