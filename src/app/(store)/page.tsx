import Link from "next/link";
import { listCatalogProducts } from "@/services/product.service";
import { getStoreSettings, listCategories } from "@/services/settings.service";
import { formatBaht } from "@/lib/format";
import { NewProductSpotlight } from "@/components/store/NewProductSpotlight";
import { MenuCatalog } from "@/components/store/MenuCatalog";
import { LandingInfoSections } from "@/components/store/LandingInfoSections";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [products, categories, settings] = await Promise.all([
    listCatalogProducts(),
    listCategories(),
    getStoreSettings(),
  ]);

  const spotlight =
    products.find((p) => p.isNew && p.wideImgUrl) ??
    products.find((p) => p.isNew) ??
    products[0];

  return (
    <>
      <section className="relative min-h-[72vh] flex items-end overflow-hidden bg-[#0d0b0a]">
        <img
          src="/images/products/hero.jpg"
          alt="สเต็กหมูพอร์คชอปย่าง ราดซอสพริกไทยดำ"
          className="absolute inset-0 w-full h-full object-cover object-[70%_50%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0b0a]/95 via-[#0d0b0a]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0b0a]/90 via-transparent to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-24 space-y-5">
          <p className="font-display text-xl sm:text-2xl text-sb-pink2 font-semibold">
            สเต็กหมักพร้อมย่าง
          </p>
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl leading-[1.05]">
            จากช่องฟรีซ
            <br />
            สู่จานร้อน
            <br />
            ใน 15 นาที
          </h1>
          <p className="max-w-lg text-base sm:text-lg text-[#e9ddd5]">
            หมู ไก่ และอกไก่คลีน หมักพริกไทยดำสูตรต้นตำรับมาให้แล้ว แค่ละลาย ย่าง
            แล้วเสิร์ฟ ได้สเต็กร้านโปรดที่บ้านทุกมื้อ
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#menu" className="sb-btn">เลือกเมนูเลย</a>
            <Link href="/track" className="sb-btn-ghost">ติดตามพัสดุ</Link>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold pt-2">
            <span className="flex items-center gap-2">
              <i className="w-2 h-2 rounded-full bg-sb-pink" /> แช่แข็ง -18°C ล็อกความสด
            </span>
            <span className="flex items-center gap-2">
              <i className="w-2 h-2 rounded-full bg-sb-pink" /> ส่งรถเย็นถึงบ้าน
            </span>
            <span className="flex items-center gap-2">
              <i className="w-2 h-2 rounded-full bg-sb-pink" /> ส่งฟรีเมื่อครบ{" "}
              {formatBaht(settings.freeShipThreshold)}
            </span>
          </div>
        </div>

        <div className="hidden md:block absolute right-8 bottom-10 z-10 w-44 bg-[#f1eeea] rounded-2xl p-2 shadow-2xl rotate-3">
          <img src="/images/products/packcard.jpg" alt="แพ็คเกจซองสเต็กบอสส์" className="rounded-xl w-full" />
          <p className="font-display font-bold text-xs text-[#3a1020] text-center pt-1.5">
            ซองนี้ → จานนั้น
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-sb-line bg-sb-bg">
        {[
          ["หมักเข้าเนื้อ", "ไม่ต้องปรุงเพิ่ม"],
          ["ย่าง ทอด อบ", "กระทะหรือหม้อทอดไร้น้ำมัน"],
          ["แพ็คสุญญากาศ", "เก็บช่องฟรีซได้นาน"],
          ["ผลิตเองที่อ่างทอง", "บริษัท สเต็กบอสส์ต้นตำรับ"],
        ].map(([title, sub]) => (
          <div key={title} className="p-5 border-r border-b lg:border-b-0 border-sb-line last:border-r-0">
            <p className="font-display font-bold text-lg">{title}</p>
            <p className="text-sm text-sb-mute">{sub}</p>
          </div>
        ))}
      </div>

      {spotlight && (
        <section id="new" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <NewProductSpotlight product={spotlight} />
        </section>
      )}

      <section id="menu" className="py-16 sm:py-20 px-4 sm:px-6 bg-sb-bgDeep">
        <div className="max-w-7xl mx-auto">
          <MenuCatalog products={products} categories={categories} />
        </div>
      </section>

      <LandingInfoSections
        bkkShipBaht={settings.bkkShipBaht}
        upcShipBaht={settings.upcShipBaht}
        freeShipThreshold={settings.freeShipThreshold}
        codFeeBaht={settings.codFeeBaht}
        lineId={settings.lineId}
        lineOaUrl={settings.lineOaUrl}
      />
    </>
  );
}
