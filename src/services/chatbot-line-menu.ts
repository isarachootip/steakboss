import { listCatalogProducts } from "./product.service";
import type { LineMessagePayload } from "./adapters/line.adapter";
import {
  buildCategoryCarouselFlex,
  buildProductCarouselFlex,
} from "./adapters/line-catalog-flex";

const MENU_TRIGGER_REGEX = /^(ดูเมนู|เมนู|สั่งซื้อ|สั่งสเต๊ก|สั่งอาหาร|เปิดเมนู)/i;

export interface LineMenuReply {
  text: string;
  flexMessages?: LineMessagePayload[];
}

export async function buildLineMenuFlexIfMatched(
  text: string,
  channel: "WEB" | "LINE"
): Promise<LineMenuReply | null> {
  if (channel !== "LINE" || !MENU_TRIGGER_REGEX.test(text.trim())) return null;

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://steakboss.odmfood.online").replace(/\/$/, "");
  const products = await listCatalogProducts();
  const catMatch = text.trim().match(/^ดูเมนู\s+(.+)$/i);

  if (catMatch?.[1]) {
    const queryCat = catMatch[1].trim().toLowerCase();
    const matched = products.filter(
      (p) =>
        p.categoryName.toLowerCase().includes(queryCat) ||
        p.categorySlug.toLowerCase().includes(queryCat)
    );
    if (matched.length > 0) {
      const catName = matched[0]!.categoryName;
      return {
        text: `เมนูหมวด ${catName} (${matched.length} รายการ) กดเลือกสั่งซื้อได้เลยครับ: ${baseUrl}/liff`,
        flexMessages: [buildProductCarouselFlex(catName, matched, baseUrl)],
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
  return {
    text: `เลือกหมวดเมนูสเต็กบอสส์ที่ต้องการได้เลยครับ หรือเปิดหน้าร้านทั้งหมดที่ ${baseUrl}/liff`,
    flexMessages: [buildCategoryCarouselFlex(Array.from(byCat.values()), baseUrl)],
  };
}
