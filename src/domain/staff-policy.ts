import type { StaffRole } from "@/schemas/staff.schema";

export interface StaffRoleMeta {
  role: StaffRole;
  label: string;
  summary: string;
  badgeClass: string;
}

export const STAFF_ROLE_META: readonly StaffRoleMeta[] = [
  {
    role: "OWNER",
    label: "เจ้าของร้าน (OWNER)",
    summary: "เข้าถึงทุกเมนู จัดการสิทธิ์พนักงาน ตั้งค่าร้าน สไลด์ ป๊อปอัป รายงาน และออเดอร์",
    badgeClass: "bg-sb-pink/20 text-sb-pink2 border-sb-pink/40",
  },
  {
    role: "ADMIN",
    label: "แอดมิน (ADMIN)",
    summary: "จัดการสินค้า สไลด์ Hero ป๊อปอัปอีเวนต์ คู่มือ ออเดอร์ แชทลูกค้า และคูปอง",
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  },
  {
    role: "PACKER",
    label: "ทีมแพ็ค (PACKER)",
    summary: "ดูรายการออเดอร์ แพ็คสินค้า พิมพ์ใบจ่าหน้า และอัปเดตเลขพัสดุ",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  },
];

export function getStaffRoleMeta(role: StaffRole): StaffRoleMeta {
  return STAFF_ROLE_META.find((m) => m.role === role) ?? STAFF_ROLE_META[2]!;
}

export interface StaffGuardTarget {
  id: string;
  role: StaffRole;
  isActive: boolean;
}

export function assertCanUpdateStaff(params: {
  actorId: string;
  target: StaffGuardTarget;
  nextRole: StaffRole;
  nextIsActive: boolean;
  activeOwnerCount: number;
}): void {
  const { actorId, target, nextRole, nextIsActive, activeOwnerCount } = params;
  const isSelf = actorId === target.id;

  if (isSelf && nextRole !== "OWNER") {
    throw new Error("ไม่สามารถลดสิทธิ์บัญชีของตัวเองออกจาก OWNER ได้");
  }
  if (isSelf && !nextIsActive) {
    throw new Error("ไม่สามารถระงับการใช้งานบัญชีของตัวเองได้");
  }

  const losingActiveOwner =
    target.role === "OWNER" &&
    target.isActive &&
    (nextRole !== "OWNER" || !nextIsActive);

  if (losingActiveOwner && activeOwnerCount <= 1) {
    throw new Error("ต้องมีบัญชี OWNER ที่ใช้งานได้อย่างน้อย 1 บัญชีเสมอ");
  }
}

export function assertCanDeleteStaff(params: {
  actorId: string;
  target: StaffGuardTarget;
  activeOwnerCount: number;
}): void {
  const { actorId, target, activeOwnerCount } = params;
  if (actorId === target.id) {
    throw new Error("ไม่สามารถลบบัญชีที่กำลังเข้าสู่ระบบอยู่ได้");
  }
  if (target.role === "OWNER" && target.isActive && activeOwnerCount <= 1) {
    throw new Error("ไม่สามารถลบ OWNER คนสุดท้ายของระบบได้");
  }
}
