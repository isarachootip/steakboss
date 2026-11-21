import { TrackingTimeline } from "@/components/store/TrackingTimeline";

export const dynamic = "force-dynamic";

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNo?: string }>;
}) {
  const { orderNo } = await searchParams;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl">
        ติดตามคำสั่งซื้อและพัสดุรถเย็น
      </h1>
      <p className="text-sb-mute">
        กรอกเลขคำสั่งซื้อ (ขึ้นต้นด้วย SB) และเบอร์โทร 4 ตัวท้ายที่ใช้สั่งซื้อ
      </p>
      <TrackingTimeline initialOrderNo={orderNo || ""} />
    </div>
  );
}
