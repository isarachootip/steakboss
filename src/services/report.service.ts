import { db } from "@/lib/db";
import { roundBaht } from "@/domain/money";
import { calculateGrossMargin } from "@/domain/pricing";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/domain/order";

export type ReportRange = "7d" | "30d" | "90d" | "all";

function getStartDate(range: ReportRange): Date | undefined {
  if (range === "all") return undefined;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000);
}

export async function buildExecutiveReport(
  range: ReportRange,
  includeCost: boolean
) {
  const since = getStartDate(range);
  const [orders, lowStockProducts] = await Promise.all([
    db.order.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      include: { items: true },
      orderBy: { createdAt: "asc" },
    }),
    db.product.findMany({
      where: { isActive: true, isBundle: false },
      select: { id: true, name: true, sku: true, stockQty: true, lowStockThreshold: true },
    }),
  ]);

  const liveOrders = orders.filter((o) => o.status !== "CANCELLED");
  const cancelledCount = orders.length - liveOrders.length;

  let grossRevenueBaht = 0;
  let totalCostBaht = 0;
  let webRevenueBaht = 0;
  let lineRevenueBaht = 0;
  let promptpayVerifiedBaht = 0;
  let promptpayPendingBaht = 0;
  let codPendingSettlementBaht = 0;
  let codSettledBaht = 0;

  const dailyMap = new Map<string, { date: string; revenueBaht: number; orders: number }>();
  const skuMap = new Map<string, { productName: string; qty: number; revenueBaht: number }>();
  const phoneCounts = new Map<string, number>();

  for (const o of liveOrders) {
    grossRevenueBaht += o.totalBaht;
    if (o.channel === "LINE") lineRevenueBaht += o.totalBaht;
    else webRevenueBaht += o.totalBaht;

    if (o.paymentMethod === "PROMPTPAY") {
      if (["PAID", "PACKING", "SHIPPED", "DELIVERED"].includes(o.status)) {
        promptpayVerifiedBaht += o.totalBaht;
      } else {
        promptpayPendingBaht += o.totalBaht;
      }
    } else {
      if (o.codSettled) codSettledBaht += o.totalBaht;
      else codPendingSettlementBaht += o.totalBaht;
    }

    const dayKey = o.createdAt.toISOString().slice(0, 10);
    const day = dailyMap.get(dayKey) ?? { date: dayKey, revenueBaht: 0, orders: 0 };
    day.revenueBaht += o.totalBaht;
    day.orders += 1;
    dailyMap.set(dayKey, day);

    phoneCounts.set(o.customerPhone, (phoneCounts.get(o.customerPhone) ?? 0) + 1);

    for (const item of o.items) {
      totalCostBaht += item.unitCostBaht * item.quantity;
      const sku = skuMap.get(item.productId) ?? {
        productName: item.productName,
        qty: 0,
        revenueBaht: 0,
      };
      sku.qty += item.quantity;
      sku.revenueBaht += item.lineTotalBaht;
      skuMap.set(item.productId, sku);
    }
  }

  grossRevenueBaht = roundBaht(grossRevenueBaht);
  totalCostBaht = roundBaht(totalCostBaht);
  webRevenueBaht = roundBaht(webRevenueBaht);
  lineRevenueBaht = roundBaht(lineRevenueBaht);
  promptpayVerifiedBaht = roundBaht(promptpayVerifiedBaht);
  promptpayPendingBaht = roundBaht(promptpayPendingBaht);
  codPendingSettlementBaht = roundBaht(codPendingSettlementBaht);
  codSettledBaht = roundBaht(codSettledBaht);

  const uniqueCustomers = phoneCounts.size;
  const repeatCustomers = Array.from(phoneCounts.values()).filter((c) => c >= 2).length;
  const repeatRatePercent =
    uniqueCustomers > 0 ? Math.round((repeatCustomers / uniqueCustomers) * 1000) / 10 : 0;

  const aovBaht =
    liveOrders.length > 0 ? roundBaht(grossRevenueBaht / liveOrders.length) : 0;
  const margin = calculateGrossMargin(grossRevenueBaht, totalCostBaht);

  return {
    range,
    summary: {
      totalOrders: orders.length,
      liveOrders: liveOrders.length,
      cancelledOrders: cancelledCount,
      grossRevenueBaht,
      aovBaht,
      uniqueCustomers,
      repeatCustomers,
      repeatRatePercent,
      ...(includeCost
        ? {
            totalCostBaht,
            grossProfitBaht: margin.grossProfitBaht,
            marginPercent: margin.marginPercent,
          }
        : {}),
    },
    channels: {
      webRevenueBaht,
      lineRevenueBaht,
    },
    reconciliation: {
      promptpayVerifiedBaht,
      promptpayPendingBaht,
      codPendingSettlementBaht,
      codSettledBaht,
    },
    dailySales: Array.from(dailyMap.values()),
    topProducts: Array.from(skuMap.values()).sort((a, b) => b.revenueBaht - a.revenueBaht),
    lowStockAlerts: lowStockProducts.filter((p) => p.stockQty <= p.lowStockThreshold),
  };
}

function csvCell(v: unknown): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export async function exportOrdersCsv(): Promise<string> {
  const orders = await db.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const header = [
    "เลขคำสั่งซื้อ",
    "วันที่",
    "ช่องทาง",
    "ลูกค้า",
    "เบอร์โทร",
    "วิธีจัดส่ง",
    "ที่อยู่",
    "รหัสไปรษณีย์",
    "รายการสินค้า",
    "ยอดสินค้า",
    "ส่วนลด",
    "ค่าส่ง",
    "ค่าCOD",
    "ยอดสุทธิ",
    "ชำระเงิน",
    "สถานะ",
    "ขนส่ง",
    "เลขพัสดุ",
  ];

  const rows = orders.map((o) => [
    o.orderNo,
    o.createdAt.toISOString(),
    o.channel,
    o.customerName,
    o.customerPhone,
    o.deliveryMethod,
    o.addressText,
    o.postalCode,
    o.items.map((i) => `${i.productName} x${i.quantity}`).join("; "),
    o.subtotalBaht,
    o.discountBaht,
    o.shippingBaht,
    o.codFeeBaht,
    o.totalBaht,
    o.paymentMethod,
    isOrderStatus(o.status) ? ORDER_STATUS_LABELS[o.status] : o.status,
    o.carrier,
    o.trackingNo,
  ]);

  return "\uFEFF" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}
