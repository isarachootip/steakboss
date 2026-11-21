import { NextResponse } from "next/server";
import { requireRole, STAFF_ROLES } from "@/lib/auth/rbac";
import { getStoreSettings, updateStoreSettings } from "@/services/settings.service";
import { updateSettingsSchema } from "@/schemas/settings.schema";

export async function GET() {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;
  const settings = await getStoreSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const guard = await requireRole(["OWNER"]);
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลตั้งค่าไม่ถูกต้อง" },
      { status: 400 }
    );
  }
  const settings = await updateStoreSettings(parsed.data);
  return NextResponse.json({ settings });
}
