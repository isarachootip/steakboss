import { listCatalogProducts } from "@/services/product.service";
import { getStoreSettings, listCategories } from "@/services/settings.service";
import { listPublishedGuides } from "@/services/content.service";
import {
  getVisibleEventPopup,
  listVisibleHeroSlides,
} from "@/services/promo.service";
import { HeroSlider } from "@/components/store/HeroSlider";
import { EventPopupModal } from "@/components/store/EventPopupModal";
import { NewProductSpotlight } from "@/components/store/NewProductSpotlight";
import { MenuCatalog } from "@/components/store/MenuCatalog";
import { LandingInfoSections } from "@/components/store/LandingInfoSections";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [products, categories, settings, slides, eventPopup, guides] =
    await Promise.all([
      listCatalogProducts(),
      listCategories(),
      getStoreSettings(),
      listVisibleHeroSlides(),
      getVisibleEventPopup(),
      listPublishedGuides(),
    ]);

  const spotlight =
    products.find((p) => p.isNew && p.wideImgUrl) ??
    products.find((p) => p.isNew) ??
    products[0];

  return (
    <>
      <HeroSlider
        slides={slides}
        freeShipThreshold={settings.freeShipThreshold}
      />

      {eventPopup && <EventPopupModal popup={eventPopup} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-sb-line bg-sb-bg">
        {[
          ["หมักเข้าเนื้อ", "ไม่ต้องปรุงเพิ่ม"],
          ["ย่าง ทอด อบ", "กระทะหรือหม้อทอดไร้น้ำมัน"],
          ["แพ็คสุญญากาศ", "เก็บช่องฟรีซได้นาน"],
          ["ตัวแทนจำหน่ายย่านรามอินทรา", "จัดจำหน่ายและจัดส่ง ภายใต้ Brand SteakBoss"],
        ].map(([title, sub]) => (
          <div
            key={title}
            className="p-5 border-r border-b lg:border-b-0 border-sb-line last:border-r-0"
          >
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
        guides={guides}
        bkkShipBaht={settings.bkkShipBaht}
        upcShipBaht={settings.upcShipBaht}
        freeShipThreshold={settings.freeShipThreshold}
        lineId={settings.lineId}
        lineOaUrl={settings.lineOaUrl}
      />
    </>
  );
}
