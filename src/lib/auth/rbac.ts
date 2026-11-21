import { NextResponse } from "next/server";
import { getSession, type SessionPayload, type UserRole } from "./session";

export const STAFF_ROLES: readonly UserRole[] = ["OWNER", "ADMIN", "PACKER"];
export const MANAGER_ROLES: readonly UserRole[] = ["OWNER", "ADMIN"];

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
  if (!allowedRoles.includes(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "บัญชีของคุณไม่มีสิทธิ์เข้าถึงส่วนนี้" },
        { status: 403 }
      ),
    };
  }
  return { ok: true, session };
}

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.includes(role);
}
