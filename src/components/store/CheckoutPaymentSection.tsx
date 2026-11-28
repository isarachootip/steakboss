"use client";

export function CheckoutPaymentSection({
  isLineChannel,
}: {
  isLineChannel: boolean;
}) {
  return (
    <div className="p-3.5 rounded-xl border border-sb-pink bg-sb-pink/10 flex gap-3">
      <input type="radio" checked readOnly className="mt-1 accent-sb-pink" />
      <span className="text-sm">
        <b>โอนพร้อมเพย์ QR{isLineChannel ? " (ช่องทาง LINE)" : ""}</b>
        <span className="block text-xs text-sb-mute">
          รอชำระผ่าน QR Code ตามยอดจริง และแนบสลิปเพื่อตรวจสอบก่อนยืนยันคำสั่งซื้อและตัดสต็อก
          (ไม่มีบริการเก็บเงินปลายทาง)
        </span>
      </span>
    </div>
  );
}
