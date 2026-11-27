import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createStaffMember,
  deleteStaffMember,
  listStaffMembers,
  updateStaffMember,
} from "@/services/staff.service";

describe("staff.service (Back-office RBAC CRUD)", () => {
  it("creates, lists, updates role/password/active, blocks duplicates, and deletes staff safely", async () => {
    const owner = await db.user.findFirstOrThrow({
      where: { role: "OWNER", isActive: true },
    });
    const email = `test-staff-${Date.now()}@steakboss.local`;

    const created = await createStaffMember({
      name: "ทดสอบแอดมิน",
      email,
      phone: null,
      role: "ADMIN",
      password: "initialPass1",
      isActive: true,
    });

    try {
      expect(created.email).toBe(email);
      expect(created.role).toBe("ADMIN");

      const list = await listStaffMembers();
      expect(list.some((m) => m.id === created.id)).toBe(true);

      await expect(
        createStaffMember({
          name: "ซ้ำ",
          email,
          phone: null,
          role: "PACKER",
          password: "password123",
          isActive: true,
        })
      ).rejects.toThrow(/อีเมล/);

      const updated = await updateStaffMember(owner.id, created.id, {
        name: "ทดสอบแพ็คเกอร์",
        role: "PACKER",
        isActive: false,
        password: "newPassword99",
      });
      expect(updated.role).toBe("PACKER");
      expect(updated.isActive).toBe(false);

      const raw = await db.user.findUniqueOrThrow({ where: { id: created.id } });
      expect(raw.passwordHash).toBeTruthy();
      expect(verifyPassword("newPassword99", raw.passwordHash!)).toBe(true);

      await expect(
        updateStaffMember(owner.id, owner.id, { role: "ADMIN" })
      ).rejects.toThrow(/ตัวเอง/);

      await deleteStaffMember(owner.id, created.id);
      const gone = await db.user.findUnique({ where: { id: created.id } });
      expect(gone).toBeNull();
    } finally {
      await db.user.deleteMany({ where: { email } });
    }
  });
});
