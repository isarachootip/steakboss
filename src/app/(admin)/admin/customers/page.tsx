import { db } from "@/lib/db";
import { formatBaht, formatDateTimeTH } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const orders = await db.order.findMany({
    include: { user: { select: { lineUserId: true } } },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<
    string,
    {
      phone: string;
      name: string;
      email: string;
      address: string;
      hasLine: boolean;
      orders: number;
      spend: number;
      lastAt: Date;
    }
  >();

  for (const o of orders) {
    const live = o.status !== "CANCELLED";
    const cur = map.get(o.customerPhone);
    if (!cur) {
      map.set(o.customerPhone, {
        phone: o.customerPhone,
        name: o.customerName,
        email: o.customerEmail,
        address: o.addressText ? `${o.addressText} ${o.postalCode}` : "รับเองที่โรงงาน",
        hasLine: Boolean(o.user?.lineUserId),
        orders: live ? 1 : 0,
        spend: live ? o.totalBaht : 0,
        lastAt: o.createdAt,
      });
    } else {
      if (live) {
        cur.orders += 1;
        cur.spend += o.totalBaht;
      }
      if (o.user?.lineUserId) cur.hasLine = true;
    }
  }

  const customers = Array.from(map.values()).sort((a, b) => b.spend - a.spend);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-extrabold text-3xl">ลูกค้า CRM ({customers.length})</h1>
        <p className="text-sm text-sb-mute">จัดอันดับตามยอดสั่งซื้อสะสม และสถานะการเชื่อมต่อ LINE OA</p>
      </div>

      <div className="sb-panel overflow-x-auto">
        {customers.length === 0 ? (
          <p className="text-center text-sb-mute py-10">ยังไม่มีข้อมูลลูกค้า</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sb-line text-sb-mute font-display">
                <th className="text-left py-2.5">ลูกค้า</th>
                <th className="text-left py-2.5">เบอร์โทร</th>
                <th className="text-left py-2.5">ที่อยู่ล่าสุด</th>
                <th className="text-right py-2.5">ออเดอร์</th>
                <th className="text-right py-2.5">ยอดซื้อสะสม</th>
                <th className="text-right py-2.5">ล่าสุด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sb-line">
              {customers.map((c) => (
                <tr key={c.phone}>
                  <td className="py-3 pr-3">
                    <p className="font-bold">{c.name}</p>
                    {c.hasLine && (
                      <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#06C755]/20 text-[#06C755] font-bold">
                        LINE Connected
                      </span>
                    )}
                  </td>
                  <td className="py-3 whitespace-nowrap">{c.phone}</td>
                  <td className="py-3 text-xs text-sb-mute max-w-xs truncate">{c.address}</td>
                  <td className="py-3 text-right font-bold">{c.orders}</td>
                  <td className="py-3 text-right font-bold text-sb-pink2">{formatBaht(c.spend)}</td>
                  <td className="py-3 text-right text-xs text-sb-mute whitespace-nowrap">
                    {formatDateTimeTH(c.lastAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
