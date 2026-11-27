import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, type SessionPayload, type UserRole } from "./session";

export const STAFF_ROLES: readonly UserRole[] = ["OWNER", "ADMIN", "PACKER"];
export const MANAGER_ROLES: readonly UserRole[] = ["OWNER", "ADMIN"];
export const OWNER_ROLES: readonly UserRole[] = ["OWNER"];

type GuardResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

export async function requireRole(
  allowedRoles: readonly UserRole[]
): Promise<GuardResult> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" },
        { status: 401 }
      ),
    };
  }

  const liveUser = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true, name: true },
  });
  if (!liveUser || !liveUser.isActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "บัญชีนี้ถูกระงับการใช้งานหรือไม่พบในระบบ" },
        { status: 401 }
      ),
    };
  }

  const effectiveRole = liveUser.role as UserRole;
  if (!allowedRoles.includes(effectiveRole)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    session: { ...session, role: effectiveRole, name: liveUser.name },
  };
}

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}
