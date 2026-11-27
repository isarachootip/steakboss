import { describe, expect, it } from "vitest";
import {
  assertCanDeleteStaff,
  assertCanUpdateStaff,
} from "@/domain/staff-policy";
import { createStaffSchema, updateStaffSchema } from "@/schemas/staff.schema";

describe("staff schemas & RBAC guard policy", () => {
  it("normalizes email & phone and rejects weak passwords", () => {
    const ok = createStaffSchema.safeParse({
      name: "แอดมินใหม่",
      email: "  NewAdmin@Steakboss.Local ",
      phone: "089-123-4567",
      role: "ADMIN",
      password: "secret123",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.email).toBe("newadmin@steakboss.local");
      expect(ok.data.phone).toBe("0891234567");
      expect(ok.data.isActive).toBe(true);
    }

    const shortPass = createStaffSchema.safeParse({
      name: "แอดมิน",
      email: "a@b.com",
      role: "ADMIN",
      password: "123",
    });
    expect(shortPass.success).toBe(false);

    const blankPasswordUpdate = updateStaffSchema.safeParse({
      name: "ชื่อใหม่",
      password: "",
    });
    expect(blankPasswordUpdate.success).toBe(true);
    if (blankPasswordUpdate.success) {
      expect(blankPasswordUpdate.data.password).toBeUndefined();
    }
  });

  it("blocks self-demotion, self-deactivation, and losing the last active OWNER", () => {
    expect(() =>
      assertCanUpdateStaff({
        actorId: "owner-1",
        target: { id: "owner-1", role: "OWNER", isActive: true },
        nextRole: "ADMIN",
        nextIsActive: true,
        activeOwnerCount: 2,
      })
    ).toThrow(/ตัวเอง/);

    expect(() =>
      assertCanUpdateStaff({
        actorId: "owner-1",
        target: { id: "owner-1", role: "OWNER", isActive: true },
        nextRole: "OWNER",
        nextIsActive: false,
        activeOwnerCount: 2,
      })
    ).toThrow(/ตัวเอง/);

    expect(() =>
      assertCanUpdateStaff({
        actorId: "owner-other",
        target: { id: "owner-last", role: "OWNER", isActive: true },
        nextRole: "ADMIN",
        nextIsActive: true,
        activeOwnerCount: 1,
      })
    ).toThrow(/OWNER/);

    expect(() =>
      assertCanUpdateStaff({
        actorId: "owner-1",
        target: { id: "owner-2", role: "OWNER", isActive: true },
        nextRole: "ADMIN",
        nextIsActive: true,
        activeOwnerCount: 2,
      })
    ).not.toThrow();
  });

  it("blocks self-deletion and deleting the last active OWNER", () => {
    expect(() =>
      assertCanDeleteStaff({
        actorId: "owner-1",
        target: { id: "owner-1", role: "OWNER", isActive: true },
        activeOwnerCount: 2,
      })
    ).toThrow(/เข้าสู่ระบบ/);

    expect(() =>
      assertCanDeleteStaff({
        actorId: "owner-2",
        target: { id: "owner-1", role: "OWNER", isActive: true },
        activeOwnerCount: 1,
      })
    ).toThrow(/สุดท้าย/);
  });
});
