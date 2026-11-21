import Link from "next/link";
import { formatBaht } from "@/lib/format";

interface LandingInfoProps {
  bkkShipBaht: number;
  upcShipBaht: number;
  freeShipThreshold: number;
  codFeeBaht: number;
  lineId: string;
  lineOaUrl: string;
}

export function LandingInfoSections(props: LandingInfoProps) {
  return (
    <>
      <section id="cook" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl">
          ย่างยังไงให้ฉ่ำแบบร้าน
        </h2>
        <p className="text-sb-mute mt-1">ทุกซองหมักมาแล้ว ไม่ต้องเติมเครื่องปรุง</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-7">
          {[
            ["1", "ละลาย", "ย้ายลงช่องเย็นข้ามคืน หรือแช่ทั้งซองในน้ำเย็น 30–40 นาที"],
            ["2", "ย่างไฟกลางค่อนแรง", "ทาน้ำมันบาง ๆ ย่างข้างละ 4–6 นาที หรือหม้อทอดไร้น้ำมัน 180°C 12–15 นาที"],
            ["3", "เช็กให้สุกทั่ว", "แกนกลางไก่ 74°C หมู 70°C ไม่มีน้ำสีชมพูไหลออก"],
            ["4", "พัก แล้วเสิร์ฟ", "พักเนื้อ 3 นาทีให้น้ำกลับเข้าเนื้อ ราดซอสพริกไทยดำ เคียงสลัดและเฟรนช์ฟรายส์"],
          ].map(([num, title, desc]) => (
            <div key={num} className="sb-panel space-y-2">
              <p className="font-display font-extrabold text-4xl text-sb-pink">{num}</p>
              <h3 className="font-display font-bold text-lg">{title}</h3>
              <p className="text-sm text-sb-mute">{desc}</p>
            </div>
          ))}
        </div>
      </section>

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
                    รับเองที่โรงงาน
                    <span className="block text-xs text-sb-mute">ต.ป่าโมก อ.ป่าโมก จ.อ่างทอง</span>
                  </td>
                  <td className="py-3 text-right font-bold">ฟรี</td>
                </tr>
                <tr>
                  <td className="py-3">ซื้อครบ {formatBaht(props.freeShipThreshold)}</td>
                  <td className="py-3 text-right font-bold text-sb-ok">ส่งฟรี</td>
                </tr>
                <tr>
                  <td className="py-3">เก็บเงินปลายทาง (COD)</td>
                  <td className="py-3 text-right font-bold">+{formatBaht(props.codFeeBaht)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
