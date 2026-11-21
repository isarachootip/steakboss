import { NextResponse } from "next/server";
import { requireRole, MANAGER_ROLES } from "@/lib/auth/rbac";
import { updateProduct } from "@/services/product.service";
import { updateProductSchema } from "@/schemas/product.schema";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const data = { ...parsed.data };
    if (guard.session.role !== "OWNER") {
      delete data.costBaht;
    }
    const product = await updateProduct(id, data);
    return NextResponse.json({ product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "แก้ไขสินค้าไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
