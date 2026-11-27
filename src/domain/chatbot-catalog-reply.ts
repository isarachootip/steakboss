import { formatBaht } from "@/lib/format";

export interface ChatCatalogItem {
  name: string;
  categorySlug: string;
  weightGrams: number;
  priceBaht: number;
  wholesalePriceBaht: number;
  bulkPriceBaht: number | null;
  tag: string;
  isBundle: boolean;
}

function formatProductLine(p: ChatCatalogItem): string {
  const wholesaleText =
    p.wholesalePriceBaht > 0 ? ` (ส่ง ${formatBaht(p.wholesalePriceBaht)})` : "";
  return `• ${p.name} ${p.weightGrams}g ปลีก ${formatBaht(p.priceBaht)}${wholesaleText}`;
}

function matchCategoryFilter(text: string): string | null {
  if (/ปลา|ซาบะ|แซลมอน/.test(text)) return "fish";
  if (/เนื้อ|วัว|ริบอาย|ทีโบน|สตริปลอยน์|เซอร์ลอยน์|เป็ด/.test(text)) return "beef";
  if (/สปาเก็ตตี้|สปาเกตตี|มันบด|สลัด|ซอส|พร้อมทาน|ตุ๋น/.test(text)) return "ready-meal";
  if (/ไก่/.test(text)) return "chicken";
  if (/หมู|พอร์คชอป/.test(text)) return "pork";
  return null;
}

export function buildCatalogChatReply(
  lowerText: string,
  products: ChatCatalogItem[],
  wholesaleMinPacks: number
): string | null {
  if (/ขายส่ง|ราคาส่ง|ตัวแทน|ยกลัง/.test(lowerText)) {
    const featured = products.filter((p) => p.tag || p.bulkPriceBaht !== null).slice(0, 5);
    return `สั่งคละครบ ${wholesaleMinPacks} แพ็คขึ้นไป ระบบคิด "ราคาส่ง" ให้อัตโนมัติทั้งตะกร้าครับ! (และมีเรตโปรยกลัง 5–10 ชิ้นขึ้นไป)\nตัวอย่างสินค้าขายดี:\n${featured.map(formatProductLine).join("\n")}`;
  }
  if (/คลีน|ลดน้ำหนัก|โปรตีน|ไดเอท|diet/.test(lowerText)) {
    const clean = products.filter((p) => p.name.includes("คลีน")).slice(0, 4);
    if (clean.length > 0) {
      return `เมนูสายคลีนพร้อมย่างครับ:\n${clean.map(formatProductLine).join("\n")}`;
    }
  }
  const catFilter = matchCategoryFilter(lowerText);
  if (catFilter || /แนะนำ|เมนู|ขายดี|มีอะไร|ราคา/.test(lowerText)) {
    const subset = catFilter
      ? products.filter((p) => p.categorySlug === catFilter).slice(0, 8)
      : products.filter((p) => p.tag || p.isBundle).slice(0, 8);
    const list = (subset.length > 0 ? subset : products.slice(0, 8)).map(formatProductLine);
    return `เมนูสเต๊กบอสส์ (รวม ${products.length} รายการ สั่งคละ ${wholesaleMinPacks} แพ็คได้ราคาส่งอัตโนมัติครับ):\n${list.join("\n")}`;
  }
  return null;
}
