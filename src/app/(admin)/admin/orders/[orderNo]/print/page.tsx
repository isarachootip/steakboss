import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatBaht, formatDateTimeTH } from "@/lib/format";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintOrderLabelPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const order = await db.order.findUnique({
    where: { orderNo },
    include: { items: true },
  });
  if (!order) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="no-print flex justify-between items-center">
        <h1 className="font-display font-bold text-xl">ใบปะหน้าพัสดุรถเย็น (-18°C)</h1>
        <PrintButton />
      </div>

      <div className="bg-white text-black rounded-2xl p-6 space-y-5 border border-neutral-300">
        <div className="flex justify-between items-start border-b border-neutral-300 pb-4">
          <div>
            <p className="font-display font-extrabold text-2xl">STEAKBOSS-MAM</p>
            <p className="text-xs">ตัวแทนจัดจำหน่ายและจัดส่ง ย่านรามอินทรา ภายใต้ Brand SteakBoss</p>
            <p className="text-xs">208 ถนนรามอินทรา ซอยรามอินทรา 57 แยก 8 ท่าแร้ง บางเขน กรุงเทพมหานคร</p>
          </div>
          <div className="text-right">
            <span className="inline-block border-2 border-black px-2.5 py-1 text-xs font-extrabold">
              FROZEN -18°C รถเย็น
            </span>
            <p className="font-mono font-bold text-lg mt-1">{order.orderNo}</p>
            <p className="text-xs">{formatDateTimeTH(order.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-neutral-300 pb-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase text-neutral-500">ผู้รับ (RECIPIENT)</p>
            <p className="font-bold text-base">{order.customerName}</p>
            <p className="font-semibold">โทร: {order.customerPhone}</p>
            <p className="mt-1">
              {order.deliveryMethod === "FACTORY_PICKUP"
                ? "รับสินค้าเองที่หน้าร้าน (ซอยรามอินทรา 57 แยก 8 ท่าแร้ง บางเขน กทม.)"
                : `${order.addressText} ${order.postalCode}`}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs font-bold uppercase text-neutral-500">การชำระเงิน</p>
            <p className="font-extrabold text-xl">
              {order.paymentMethod === "COD" ? `เก็บปลายทาง ${formatBaht(order.totalBaht)}` : "ชำระเงินแล้ว / โอน"}
            </p>
            {order.carrier && <p className="text-xs">ขนส่ง: {order.carrier}</p>}
            {order.trackingNo && <p className="font-mono text-sm font-bold">{order.trackingNo}</p>}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase text-neutral-500 mb-2">รายการจัดแพ็ค (PACKING LIST)</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left">
                <th className="py-1.5">สินค้า</th>
                <th className="py-1.5 text-right">จำนวน</th>
                <th className="py-1.5 text-right">ราคา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-1.5">{it.productName}</td>
                  <td className="py-1.5 text-right font-bold">× {it.quantity}</td>
                  <td className="py-1.5 text-right">{formatBaht(it.lineTotalBaht)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {order.note && <p className="text-xs mt-3 p-2 bg-neutral-100 rounded">หมายเหตุลูกค้า: {order.note}</p>}
        </div>
      </div>
    </div>
  );
}
