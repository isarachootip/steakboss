import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  assertCanDeleteStaff,
  assertCanUpdateStaff,
} from "@/domain/staff-policy";
import {
  staffRoleSchema,
  type CreateStaffInput,
  type StaffMemberDto,
  type StaffRole,
  type UpdateStaffInput,
} from "@/schemas/staff.schema";

const STAFF_ROLES_LIST: StaffRole[] = ["OWNER", "ADMIN", "PACKER"];

const ROLE_ORDER: Record<StaffRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  PACKER: 2,
};

function mapStaffRow(row: User): StaffMemberDto {
  const parsedRole = staffRoleSchema.safeParse(row.role);
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    phone: row.phone,
    role: parsedRole.success ? parsedRole.data : "PACKER",
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listStaffMembers(): Promise<StaffMemberDto[]> {
  const rows = await db.user.findMany({
    where: { role: { in: STAFF_ROLES_LIST } },
    orderBy: [{ createdAt: "asc" }],
  });
  return rows
    .map(mapStaffRow)
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
}

export async function createStaffMember(
  input: CreateStaffInput
): Promise<StaffMemberDto> {
  const dupEmail = await db.user.findUnique({ where: { email: input.email } });
  if (dupEmail) {
    throw new Error(`อีเมล "${input.email}" มีอยู่ในระบบแล้ว`);
  }
  if (input.phone) {
    const dupPhone = await db.user.findUnique({ where: { phone: input.phone } });
    if (dupPhone) {
      throw new Error(`เบอร์โทร "${input.phone}" มีอยู่ในระบบแล้ว`);
    }
  }

  const row = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      isActive: input.isActive,
      passwordHash: hashPassword(input.password),
    },
  });
  return mapStaffRow(row);
}

export async function updateStaffMember(
  actorId: string,
  targetId: string,
  input: UpdateStaffInput
): Promise<StaffMemberDto> {
  const existing = await db.user.findUnique({ where: { id: targetId } });
  if (!existing || !staffRoleSchema.safeParse(existing.role).success) {
    throw new Error("ไม่พบบัญชีพนักงานที่ต้องการแก้ไข");
  }

  const currentRole = existing.role as StaffRole;
  const nextRole = input.role ?? currentRole;
  const nextIsActive = input.isActive ?? existing.isActive;

  const activeOwnerCount = await db.user.count({
    where: { role: "OWNER", isActive: true },
  });

  assertCanUpdateStaff({
    actorId,
    target: { id: existing.id, role: currentRole, isActive: existing.isActive },
    nextRole,
    nextIsActive,
    activeOwnerCount,
  });

  if (input.email && input.email !== existing.email) {
    const dupEmail = await db.user.findUnique({ where: { email: input.email } });
    if (dupEmail && dupEmail.id !== targetId) {
      throw new Error(`อีเมล "${input.email}" ถูกใช้งานโดยบัญชีอื่นแล้ว`);
    }
  }
  if (input.phone && input.phone !== existing.phone) {
    const dupPhone = await db.user.findUnique({ where: { phone: input.phone } });
    if (dupPhone && dupPhone.id !== targetId) {
      throw new Error(`เบอร์โทร "${input.phone}" ถูกใช้งานโดยบัญชีอื่นแล้ว`);
    }
  }

  const row = await db.user.update({
    where: { id: targetId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
    },
  });
  return mapStaffRow(row);
}

export async function deleteStaffMember(
  actorId: string,
  targetId: string
): Promise<void> {
  const existing = await db.user.findUnique({ where: { id: targetId } });
  if (!existing || !staffRoleSchema.safeParse(existing.role).success) {
    throw new Error("ไม่พบบัญชีพนักงานที่ต้องการลบ");
  }

  const activeOwnerCount = await db.user.count({
    where: { role: "OWNER", isActive: true },
  });

  assertCanDeleteStaff({
    actorId,
    target: {
      id: existing.id,
      role: existing.role as StaffRole,
      isActive: existing.isActive,
    },
    activeOwnerCount,
  });

  await db.$transaction([
    db.order.updateMany({ where: { userId: targetId }, data: { userId: null } }),
    db.chatThread.updateMany({
      where: { userId: targetId },
      data: { userId: null },
    }),
    db.user.delete({ where: { id: targetId } }),
  ]);
}
