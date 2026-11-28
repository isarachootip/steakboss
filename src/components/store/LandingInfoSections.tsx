import Link from "next/link";
import type { CookingGuideDto } from "@/schemas/content.schema";
import { formatBaht } from "@/lib/format";
import { CookingGuidesTabs } from "./CookingGuidesTabs";

interface LandingInfoProps {
  guides: CookingGuideDto[];
  bkkShipBaht: number;
  upcShipBaht: number;
  freeShipThreshold: number;
  lineId: string;
  lineOaUrl: string;
}

export function LandingInfoSections(props: LandingInfoProps) {
  return (
    <>
      <CookingGuidesTabs guides={props.guides} />

      <section id="ship" className="py-16 sm:py-20 px-4 sm:px-6 bg-sb-bgDeep">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-3">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl">
              ค่าจัดส่งแบบเย็นตลอดทาง
            </h2>
            <p className="text-sb-mute">
              แพ็คในกล่องโฟมพร้อมเจลเย็น ส่งด้วยรถควบคุมอุณหภูมิ คิดค่าส่งตามรหัสไปรษณีย์ปลายทาง
            </p>
            <p className="text-sm text-sb-mute">
              ตัดรอบแพ็คทุกวัน พร้อมแจ้งเลขพัสดุผ่าน LINE OA และหน้าติดตามคำสั่งซื้อ
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link href="/track" className="sb-btn-ghost text-sm">
                เช็กสถานะพัสดุ
              </Link>
              <a
                href={props.lineOaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-5 min-h-[44px] rounded-full bg-[#06C755] text-white font-display font-bold text-sm"
              >
                ทัก LINE OA ({props.lineId})
              </a>
            </div>
          </div>

          <div className="sb-panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sb-line text-sb-mute font-display">
                  <th className="text-left py-2.5">พื้นที่จัดส่ง</th>
                  <th className="text-right py-2.5">ค่าบริการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sb-line">
                <tr>
                  <td className="py-3">
                    กรุงเทพฯ และปริมณฑล
                    <span className="block text-xs text-sb-mute">รหัสขึ้นต้น 10, 11, 12, 73, 74</span>
                  </td>
                  <td className="py-3 text-right font-bold">{formatBaht(props.bkkShipBaht)}</td>
                </tr>
                <tr>
                  <td className="py-3">
                    ต่างจังหวัด
                    <span className="block text-xs text-sb-mute">รถเย็นควบคุมอุณหภูมิทั่วประเทศ</span>
                  </td>
                  <td className="py-3 text-right font-bold">{formatBaht(props.upcShipBaht)}</td>
                </tr>
                <tr>
                  <td className="py-3">
                    รับเองที่หน้าร้าน (ย่านรามอินทรา)
                    <span className="block text-xs text-sb-mute">
                      208 ถนนรามอินทรา ซอยรามอินทรา 57 แยก 8 ท่าแร้ง บางเขน กรุงเทพมหานคร
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold">ฟรี</td>
                </tr>
                <tr>
                  <td className="py-3">ซื้อครบ {formatBaht(props.freeShipThreshold)}</td>
                  <td className="py-3 text-right font-bold text-sb-ok">ส่งฟรี</td>
                </tr>
                <tr>
                  <td className="py-3">
                    ช่องทางชำระเงิน
                    <span className="block text-xs text-sb-mute">สแกน QR พร้อมเพย์ และตรวจสลิปก่อนยืนยันออเดอร์</span>
                  </td>
                  <td className="py-3 text-right font-bold">PromptPay QR</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
