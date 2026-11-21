import { NextResponse } from "next/server";
import { requireRole, MANAGER_ROLES, STAFF_ROLES } from "@/lib/auth/rbac";
import { createProduct, listAdminProducts } from "@/services/product.service";
import { listCategories } from "@/services/settings.service";
import { createProductSchema } from "@/schemas/product.schema";

export async function GET() {
  const guard = await requireRole(STAFF_ROLES);
  if (!guard.ok) return guard.response;

  const includeCost = guard.session.role === "OWNER";
  const [products, categories] = await Promise.all([
    listAdminProducts(includeCost),
    listCategories(),
  ]);
  return NextResponse.json({ products, categories, includeCost });
}

export async function POST(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูลสินค้าไม่ถูกต้อง" },
        { status: 400 }
      );
    }
    const product = await createProduct(parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "เพิ่มสินค้าไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
