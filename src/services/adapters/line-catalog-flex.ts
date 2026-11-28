import type { LineFlexBubble } from "./line-flex";

function toAbsoluteHttpsImage(imgUrl: string, baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const full = imgUrl.startsWith("/") ? `${cleanBase}${imgUrl}` : imgUrl;
  if (full.startsWith("https://")) return full;
  return `https://steakboss.odmfood.online${imgUrl.startsWith("/") ? imgUrl : "/images/products/kp-plated.jpg"}`;
}

export interface FlexCategoryItem {
  name: string;
  count: number;
  imageUrl: string;
}

export interface FlexProductItem {
  slug: string;
  name: string;
  priceBaht: number;
  wholesalePriceBaht: number;
  weightGrams: number;
  platedImgUrl: string;
}

export function buildCategoryCarouselFlex(
  categories: readonly FlexCategoryItem[],
  baseUrl: string
): LineFlexBubble {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const bubbles = categories.slice(0, 9).map((cat) => ({
    type: "bubble",
    size: "kilo",
    hero: {
      type: "image",
      url: toAbsoluteHttpsImage(cat.imageUrl, cleanBase),
      size: "full",
      aspectRatio: "4:3",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [
        { type: "text", text: cat.name.slice(0, 60), weight: "bold", size: "md", wrap: true },
        { type: "text", text: `${cat.count} เมนูพร้อมส่งแช่แข็ง`, size: "xs", color: "#666666" },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#c99e2e",
          height: "sm",
          action: { type: "message", label: "ดูเมนูในหมวดนี้", text: `ดูเมนู ${cat.name}` },
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: { type: "uri", label: "สั่งซื้อผ่านร้าน", uri: `${cleanBase}/liff` },
        },
      ],
    },
  }));

  return {
    type: "flex",
    altText: "เมนูสเต็กบอสส์ — เลือกหมวดหมู่ที่ต้องการสั่งซื้อ",
    contents: { type: "carousel", contents: bubbles },
  };
}

export function buildProductCarouselFlex(
  categoryName: string,
  products: readonly FlexProductItem[],
  baseUrl: string
): LineFlexBubble {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const productBubbles = products.slice(0, 9).map((p) => ({
    type: "bubble",
    size: "kilo",
    hero: {
      type: "image",
      url: toAbsoluteHttpsImage(p.platedImgUrl, cleanBase),
      size: "full",
      aspectRatio: "4:3",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [
        { type: "text", text: p.name.slice(0, 60), weight: "bold", size: "sm", wrap: true },
        { type: "text", text: `ปลีก ฿${p.priceBaht} · ส่ง ฿${p.wholesalePriceBaht}`, size: "sm", color: "#c99e2e", weight: "bold" },
        { type: "text", text: `ขนาด ${p.weightGrams}g · คละครบ 10 แพ็คได้ราคาส่ง`, size: "xxs", color: "#666666", wrap: true },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#c99e2e",
          height: "sm",
          action: {
            type: "uri",
            label: "สั่งซื้อเมนูนี้",
            uri: `${cleanBase}/liff?next=${encodeURIComponent(`/products/${p.slug}`)}`,
          },
        },
      ],
    },
  }));

  productBubbles.push({
    type: "bubble",
    size: "kilo",
    hero: {
      type: "image",
      url: toAbsoluteHttpsImage("/images/products/set-plated.jpg", cleanBase),
      size: "full",
      aspectRatio: "4:3",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      contents: [
        { type: "text", text: `ดู${categoryName}ทั้งหมด`, weight: "bold", size: "sm", wrap: true },
        { type: "text", text: "เลือกคละได้ครบทั้ง 89 เมนูในตะกร้าเดียว", size: "sm", color: "#c99e2e", weight: "bold" },
        { type: "text", text: "ล็อกอิน LINE อัตโนมัติ จำที่อยู่จัดส่งให้ทันที", size: "xxs", color: "#666666", wrap: true },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#06C755",
          height: "sm",
          action: { type: "uri", label: "เปิดหน้าร้านทั้งหมด", uri: `${cleanBase}/liff` },
        },
      ],
    },
  });

  return {
    type: "flex",
    altText: `เมนู ${categoryName} — สเต็กบอสส์`,
    contents: { type: "carousel", contents: productBubbles },
  };
}
