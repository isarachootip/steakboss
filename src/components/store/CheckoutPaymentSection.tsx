"use client";

import { formatBaht } from "@/lib/format";

export function CheckoutPaymentSection({
  isLineChannel,
  paymentMethod,
  codFeeBaht,
  onChange,
}: {
  isLineChannel: boolean;
  paymentMethod: "PROMPTPAY" | "COD";
  codFeeBaht: number;
  onChange: (method: "PROMPTPAY" | "COD") => void;
}) {
  if (isLineChannel) {
    return (
      <div className="space-y-2">
        <div className="p-3.5 rounded-xl border border-sb-pink bg-sb-pink/10 flex gap-3">
          <input
            type="radio"
            checked
            readOnly
            className="mt-1 accent-sb-pink"
          />
          <span className="text-sm">
            <b>โอนพร้อมเพย์ QR (ช่องทาง LINE)</b>
            <span className="block text-xs text-sb-mute">
              รอชำระผ่าน QR Code และแนบสลิปเพื่อตรวจสอบก่อนยืนยันคำสั่งซื้อและตัดสต็อก
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label
        className={`p-3.5 rounded-xl border cursor-pointer flex gap-3 ${
          paymentMethod === "PROMPTPAY"
            ? "border-sb-pink bg-sb-pink/10"
            : "border-sb-line"
        }`}
      >
        <input
          type="radio"
          checked={paymentMethod === "PROMPTPAY"}
          onChange={() => onChange("PROMPTPAY")}
          className="mt-1 accent-sb-pink"
        />
        <span className="text-sm">
          <b>โอนพร้อมเพย์ QR</b>
          <span className="block text-xs text-sb-mute">
            QR ตามยอดจริง + แนบสลิปเพื่อตรวจสอบก่อนยืนยัน
          </span>
        </span>
      </label>
      <label
        className={`p-3.5 rounded-xl border cursor-pointer flex gap-3 ${
          paymentMethod === "COD"
            ? "border-sb-pink bg-sb-pink/10"
            : "border-sb-line"
        }`}
      >
        <input
          type="radio"
          checked={paymentMethod === "COD"}
          onChange={() => onChange("COD")}
          className="mt-1 accent-sb-pink"
        />
        <span className="text-sm">
          <b>เก็บเงินปลายทาง (COD)</b>
          <span className="block text-xs text-sb-mute">
            +{formatBaht(codFeeBaht)}
          </span>
        </span>
      </label>
    </div>
  );
}
