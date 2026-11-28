"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Copy } from "lucide-react";
import { formatBaht, STATUS_BADGE_STYLE } from "@/lib/format";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/domain/order";
import { SlipUploadForm } from "./SlipUploadForm";

interface PaymentOrderProps {
  orderNo: string;
  initialStatus: string;
  customerName: string;
  paymentMethod: string;
  totalBaht: number;
  promptpayId: string;
  promptpayName: string;
  qrDataUrl: string | null;
  items: Array<{ productName: string; quantity: number; lineTotalBaht: number }>;
}

export function PaymentPanel(props: PaymentOrderProps) {
  const [status, setStatus] = useState(props.initialStatus);
  const label = isOrderStatus(status) ? ORDER_STATUS_LABELS[status] : status;
  const isPaidOrCod = ["PAID", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED"].includes(status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="sb-panel text-center space-y-3">
        <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE_STYLE[status] ?? ""}`}>
          {label}
        </span>
        <h1 className="font-display font-extrabold text-3xl">
          ขอบคุณ คุณ{props.customerName}
        </h1>
        <div className="flex items-center justify-center gap-2">
          <span className="font-display font-extrabold text-2xl sm:text-3xl text-sb-pink2 tracking-wider">
            {props.orderNo}
          </span>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(props.orderNo)}
            className="sb-btn-dark px-3 min-h-[34px] text-xs"
          >
            <Copy className="w-3.5 h-3.5" /> คัดลอก
          </button>
        </div>
        <p className="text-sb-mute">
          ยอดชำระ <b className="text-sb-ink text-lg">{formatBaht(props.totalBaht)}</b> ·{" "}
          {props.paymentMethod === "COD" ? "เก็บเงินปลายทาง" : "โอนผ่านพร้อมเพย์"}
        </p>
      </div>

      {props.paymentMethod === "PROMPTPAY" && !isPaidOrCod && (
        <div className="space-y-4">
          <div className="sb-panel bg-amber-950/30 border-amber-700/50 flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-300 shrink-0" />
            <div className="text-sm">
              {status === "SLIP_SUBMITTED" ? (
                <>
                  <p className="font-bold text-amber-200">
                    ได้รับสลิปแล้ว — อยู่ระหว่างตรวจสอบสลิป
                  </p>
                  <p className="text-sb-mute">
                    ระบบจะยืนยันคำสั่งซื้อและตัดสต็อกให้ทันทีที่ตรวจสอบสลิปผ่านครับ
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-amber-200">
                    รอชำระเงิน — คำสั่งซื้อนี้ยังไม่ได้รับการยืนยัน
                  </p>
                  <p className="text-sb-mute">
                    กรุณาสแกน QR พร้อมเพย์ด้านล่าง และแนบสลิป (หรือส่งสลิปในแชท LINE) เพื่อตรวจสอบก่อนยืนยันออเดอร์
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="sb-panel text-center space-y-3">
              <h2 className="font-display font-bold text-xl">สแกน QR พร้อมเพย์</h2>
              <p className="text-xs text-sb-mute">
                ยอดเงิน {formatBaht(props.totalBaht)} ถูกฝังใน QR Code แล้ว
              </p>
              {props.qrDataUrl && (
                <div className="bg-white p-3 rounded-2xl inline-block">
                  <img src={props.qrDataUrl} alt="PromptPay QR" className="w-56 h-56" />
                </div>
              )}
              <p className="text-sm font-semibold">{props.promptpayName}</p>
              <p className="text-xs text-sb-mute">พร้อมเพย์: {props.promptpayId}</p>
            </div>

            <SlipUploadForm orderNo={props.orderNo} onStatusChange={setStatus} />
          </div>
        </div>
      )}

      {isPaidOrCod && (
        <div className="sb-panel bg-emerald-950/40 border-emerald-700/50 flex items-center gap-3">
          <CheckCircle2 className="w-7 h-7 text-sb-ok shrink-0" />
          <div className="text-sm">
            <p className="font-bold text-sb-ok">รับคำสั่งซื้อเรียบร้อยแล้ว!</p>
            <p className="text-sb-mute">
              ทีมงานจัดส่งย่านรามอินทรา ภายใต้ Brand SteakBoss จะจัดแพ็คและแจ้งเลขพัสดุรถเย็นให้คุณทันทีที่ส่งออก
            </p>
          </div>
        </div>
      )}

      <div className="sb-panel space-y-2">
        <p className="font-display font-bold">รายการสินค้าในคำสั่งซื้อ</p>
        {props.items.map((i, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>{i.productName} × {i.quantity}</span>
            <span>{formatBaht(i.lineTotalBaht)}</span>
          </div>
        ))}
        <div className="pt-3 flex flex-wrap gap-3">
          <Link href={`/track?orderNo=${props.orderNo}`} className="sb-btn">
            ติดตามสถานะพัสดุ
          </Link>
          <Link href="/" className="sb-btn-ghost">
            กลับหน้าร้าน
          </Link>
        </div>
      </div>
    </div>
  );
}
