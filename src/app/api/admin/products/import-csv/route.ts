import { NextResponse } from "next/server";
import { requireRole, MANAGER_ROLES } from "@/lib/auth/rbac";
import { importPriceSheetCsvSchema } from "@/schemas/product.schema";
import { importPriceSheetCsv } from "@/services/catalog-import.service";

export async function POST(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    const parsed = importPriceSheetCsvSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "ข้อมูล CSV ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const result = await importPriceSheetCsv(parsed.data.csvText, {
      defaultStockQty: parsed.data.defaultStockQty,
    });
    return NextResponse.json({ summary: result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "นำเข้าใบราคา CSV ไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
