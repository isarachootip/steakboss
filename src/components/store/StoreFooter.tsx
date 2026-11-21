import Link from "next/link";

interface StoreFooterProps {
  phone: string;
  lineId: string;
  lineOaUrl: string;
  facebookPage: string;
}

export function StoreFooter({
  phone,
  lineId,
  lineOaUrl,
  facebookPage,
}: StoreFooterProps) {
  return (
    <footer className="border-t border-sb-line bg-sb-bgDeep py-14 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-2">
          <div className="font-display font-extrabold text-2xl">
            STEAK<span className="text-sb-pink">BOSS</span>
          </div>
          <p className="text-sm text-sb-mute">
            ผลิตโดย บริษัท สเต็กบอสส์ต้นตำรับ จำกัด
            <br />
            548/8 ม.2 ต.ป่าโมก อ.ป่าโมก จ.อ่างทอง 14130
          </p>
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="font-display font-bold text-base">ติดต่อร้าน</p>
          {phone && <p className="text-sb-mute">โทร: {phone}</p>}
          {lineId && (
            <p className="text-sb-mute">
              LINE OA:{" "}
              <a
                href={lineOaUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="text-[#06C755] font-semibold hover:underline"
              >
                {lineId}
              </a>
            </p>
          )}
          {facebookPage && (
            <p className="text-sb-mute">Facebook: {facebookPage}</p>
          )}
          <p className="text-sb-mute">www.steakbossoriginal.com</p>
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="font-display font-bold text-base">ช้อปง่าย</p>
          <p className="text-sb-mute space-x-2">
            <Link href="/#menu" className="text-sb-pink2 hover:underline">
              เมนูทั้งหมด
            </Link>
            <span>·</span>
            <Link href="/#ship" className="text-sb-pink2 hover:underline">
              ค่าจัดส่ง
            </Link>
            <span>·</span>
            <Link href="/track" className="text-sb-pink2 hover:underline">
              ติดตามพัสดุ
            </Link>
          </p>
          <p className="text-sb-mute">
            เก็บรักษาที่ -18°C ละลายแล้วไม่ควรนำกลับไปแช่แข็งซ้ำ
          </p>
        </div>
      </div>
    </footer>
  );
}
