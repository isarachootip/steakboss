import { NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/auth/rbac";
import { lineAdminActionSchema } from "@/schemas/line.schema";
import {
  getAdminLineStatus,
  sendAdminLineTestPush,
  syncStoreLineFromBot,
} from "@/services/line-admin.service";

export async function GET() {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  const status = await getAdminLineStatus();
  return NextResponse.json({ status });
}

export async function POST(req: Request) {
  const guard = await requireRole(["OWNER"]);
  if (!guard.ok) return guard.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = lineAdminActionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "คำสั่งไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  if (parsed.data.action === "test_push") {
    const result = await sendAdminLineTestPush({ to: parsed.data.to });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "ส่งข้อความทดสอบไม่สำเร็จ", result },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, result });
  }

  const synced = await syncStoreLineFromBot();
  if (!synced.ok || !synced.settings) {
    return NextResponse.json(
      { error: synced.error ?? "ซิงก์ข้อมูล LINE OA ไม่สำเร็จ" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    settings: synced.settings,
    bot: synced.bot,
  });
}
