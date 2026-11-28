import { db } from "@/lib/db";
import { listCatalogProducts } from "./product.service";
import { getStoreSettings } from "./settings.service";
import { formatBaht } from "@/lib/format";
import {
  buildSteakbossQuickReply,
  type LineMessagePayload,
} from "./adapters/line-flex";
import {
  buildCategoryCarouselFlex,
  buildProductCarouselFlex,
} from "./adapters/line-catalog-flex";

const MENU_TRIGGER_REGEX = /^(ดูเมนู|เมนู|สั่งซื้อ|สั่งสเต๊ก|สั่งอาหาร|เปิดเมนู|สั่งสินค้า)/i;
const GREETING_REGEX = /^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|ทัก|เริ่ม|hi\b|hello\b|start\b)/i;
const PROMO_REGEX = /โปรโมชั่น|โปรโมชัน|ส่วนลด|คูปอง|promo/i;

export interface LineMenuReply {
  text: string;
  flexMessages?: LineMessagePayload[];
}

export async function buildLineMenuFlexIfMatched(
  text: string,
  channel: "WEB" | "LINE"
): Promise<LineMenuReply | null> {
  if (channel !== "LINE") return null;

  const clean = text.trim();
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://steakboss.odmfood.online").replace(/\/$/, "");
  const quickReply = buildSteakbossQuickReply(baseUrl);

  if (GREETING_REGEX.test(clean)) {
    const replyText =
      "สวัสดีครับ ยินดีต้อนรับสู่ STEAKBOSS-MAM ตัวแทนจัดจำหน่ายและจัดส่ง ย่านรามอินทรา ภายใต้ Brand SteakBoss 🥩\nเลือกเมนูหรือบริการที่ต้องการจากปุ่มด้านล่างได้เลยครับ 👇";
    return {
      text: replyText,
      flexMessages: [{ type: "text", text: replyText, quickReply }],
    };
  }

  if (PROMO_REGEX.test(clean)) {
    const [settings, coupons] = await Promise.all([
      getStoreSettings(),
      db.coupon.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);
    const couponLines = coupons.map((c) => {
      const desc =
        c.type === "FREE_SHIP"
          ? "ส่งฟรี"
          : c.type === "PERCENT"
            ? `ลด ${c.value}%`
            : `ลด ${formatBaht(c.value)}`;
      const minText = c.minSubtotal > 0 ? ` (ขั้นต่ำ ${formatBaht(c.minSubtotal)})` : "";
      return `• โค้ด ${c.code}: ${desc}${minText}`;
    });
    const promoText = [
      "🎁 โปรโมชั่น SteakBoss ปัจจุบัน:",
      `• สั่งคละครบ ${settings.wholesaleMinPacks} แพ็ค รับราคาส่งอัตโนมัติ`,
      `• ซื้อครบ ${formatBaht(settings.freeShipThreshold)} ส่งรถเย็นฟรี!`,
      ...couponLines,
      `กดเลือกเมนูสั่งซื้อได้เลยครับ 👇`,
    ].join("\n");
    return {
      text: promoText,
      flexMessages: [{ type: "text", text: promoText, quickReply }],
    };
  }

  if (!MENU_TRIGGER_REGEX.test(clean)) return null;

  const products = await listCatalogProducts();
  const catMatch = clean.match(/^ดูเมนู\s+(.+)$/i);

  if (catMatch?.[1]) {
    const queryCat = catMatch[1].trim().toLowerCase();
    const matched = products.filter(
      (p) =>
        p.categoryName.toLowerCase().includes(queryCat) ||
        p.categorySlug.toLowerCase().includes(queryCat)
    );
    if (matched.length > 0) {
      const catName = matched[0]!.categoryName;
      const flex = buildProductCarouselFlex(catName, matched, baseUrl);
      return {
        text: `เมนูหมวด ${catName} (${matched.length} รายการ) กดเลือกสั่งซื้อได้เลยครับ: ${baseUrl}/liff`,
        flexMessages: [{ ...flex, quickReply }],
      };
    }
  }

  const byCat = new Map<string, { name: string; count: number; imageUrl: string }>();
  for (const p of products) {
    const entry = byCat.get(p.categorySlug);
    if (entry) {
      entry.count += 1;
    } else {
      byCat.set(p.categorySlug, { name: p.categoryName, count: 1, imageUrl: p.platedImgUrl });
    }
  }
  const catFlex = buildCategoryCarouselFlex(Array.from(byCat.values()), baseUrl);
  return {
    text: `เลือกหมวดเมนูสเต็กบอสส์ที่ต้องการได้เลยครับ หรือเปิดหน้าร้านทั้งหมดที่ ${baseUrl}/liff`,
    flexMessages: [{ ...catFlex, quickReply }],
  };
}
