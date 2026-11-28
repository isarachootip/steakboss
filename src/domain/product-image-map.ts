import type { PriceSheetCategorySlug } from "./price-sheet-normalizer";

export interface ProductImageSet {
  platedImgUrl: string;
  packImgUrl: string;
  wideImgUrl: string | null;
}

const P = (file: string) => `/images/products/${file}`;

function resolveReadyMealImage(cleanName: string): ProductImageSet {
  const packImgUrl = P("ready-meal-pack.jpg");
  if (cleanName.includes("ซอสพริกไทยดำ")) {
    return { platedImgUrl: P("rm-pepper-sauce.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("มันบด") && cleanName.includes("เกรวี่")) {
    return { platedImgUrl: P("rm-mashed-gravy.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("มันบด")) {
    return { platedImgUrl: P("rm-mashed-plain.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("สลัด")) {
    return { platedImgUrl: P("rm-salad-dressing.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("เส้นสปาเก็ตตี้") || cleanName.includes("เส้นสปาเกตตี")) {
    return { platedImgUrl: P("rm-spaghetti-plain.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("คาโบนาร่า") && cleanName.includes("ไส้กรอก")) {
    return { platedImgUrl: P("rm-spag-carbonara-sausage.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("คาโบนาร่า")) {
    return { platedImgUrl: P("rm-spag-carbonara-bacon.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ซอสไก่")) {
    return { platedImgUrl: P("rm-spag-sauce-chicken.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ซอสเนื้อ")) {
    return { platedImgUrl: P("rm-spag-sauce-beef.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ซอสหมู")) {
    return { platedImgUrl: P("rm-spag-sauce-pork.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("เบคอนพริกแห้ง")) {
    return { platedImgUrl: P("rm-spag-bacon-chili.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ขี้เมาไก่")) {
    return { platedImgUrl: P("rm-spag-keemao-chicken.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ขี้เมาหมู")) {
    return { platedImgUrl: P("rm-spag-keemao-pork.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ไวท์ครีม")) {
    return { platedImgUrl: P("rm-spag-white-cream.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("หอยลาย")) {
    return { platedImgUrl: P("rm-spag-clam.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("กระเทียมพริกไทย")) {
    return { platedImgUrl: P("rm-garlic-pepper-pork.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ขาหมู")) {
    return { platedImgUrl: P("rm-pork-knuckle.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("เนื้อเปื่อยตุ๋น")) {
    return { platedImgUrl: P("rm-braised-beef.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("หมูตุ๋น")) {
    return { platedImgUrl: P("rm-braised-pork.jpg"), packImgUrl, wideImgUrl: null };
  }
  return { platedImgUrl: P("rm-braised-pork.jpg"), packImgUrl, wideImgUrl: null };
}

function resolveFishImage(cleanName: string): ProductImageSet {
  const packImgUrl = P("fish-pack.jpg");
  if (cleanName.includes("ซาบะ") && cleanName.includes("ย่างญี่ปุ่น")) {
    return { platedImgUrl: P("fish-saba-jp-grill.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ซาบะ")) {
    return { platedImgUrl: P("fish-saba-teriyaki.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ครีมปารีส")) {
    return { platedImgUrl: P("fish-salmon-cream.jpg"), packImgUrl, wideImgUrl: null };
  }
  return { platedImgUrl: P("fish-salmon-teriyaki.jpg"), packImgUrl, wideImgUrl: null };
}

function resolveChickenImage(cleanName: string): ProductImageSet {
  if (cleanName.includes("คลีน")) {
    return { platedImgUrl: P("clean-plated.jpg"), packImgUrl: P("clean-pack.jpg"), wideImgUrl: null };
  }
  const packImgUrl = P("chk-pack.jpg");
  if (cleanName.includes("เสียบไม้")) {
    return { platedImgUrl: P("chk-skewers.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("หมาเซ็ง")) {
    return { platedImgUrl: P("chk-mazeng.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("เทริยากิ")) {
    return { platedImgUrl: P("chk-teriyaki-diced.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("คลาสสิค") || cleanName.includes("จัมโบ้")) {
    return { platedImgUrl: P("chk-classic-cream.jpg"), packImgUrl, wideImgUrl: null };
  }
  return { platedImgUrl: P("chk-plated.jpg"), packImgUrl, wideImgUrl: null };
}

function resolveBeefImage(cleanName: string): ProductImageSet {
  const packImgUrl = P("prem-pack.jpg");
  const isHero = cleanName.includes("CAPA") || cleanName.includes("ทีโบน PM");
  const wideImgUrl = isHero ? P("prem-wide.jpg") : null;

  if (cleanName.includes("เป็ด")) {
    return { platedImgUrl: P("beef-duck-breast.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("คู่หู")) {
    return { platedImgUrl: P("beef-combo-duo.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("ทีโบน")) {
    return { platedImgUrl: P("beef-tbone.jpg"), packImgUrl, wideImgUrl };
  }
  if (cleanName.includes("ริบอาย")) {
    return { platedImgUrl: P("beef-ribeye.jpg"), packImgUrl, wideImgUrl };
  }
  if (cleanName.includes("หมาเซ็ง")) {
    return { platedImgUrl: P("beef-mazeng.jpg"), packImgUrl, wideImgUrl: null };
  }
  return { platedImgUrl: P("beef-striploin.jpg"), packImgUrl, wideImgUrl };
}

function resolvePorkImage(cleanName: string): ProductImageSet {
  if (cleanName.includes("พอร์คชอป")) {
    return { platedImgUrl: P("kp-plated.jpg"), packImgUrl: P("kp-pack.jpg"), wideImgUrl: null };
  }
  const packImgUrl = P("pork-pack.jpg");
  if (cleanName.includes("คู่หู")) {
    return { platedImgUrl: P("pork-combo-duo.jpg"), packImgUrl: P("set-pack.jpg"), wideImgUrl: null };
  }
  if (cleanName.includes("เสียบไม้")) {
    return { platedImgUrl: P("pork-skewers.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("หมาเซ็ง")) {
    return { platedImgUrl: P("pork-mazeng.jpg"), packImgUrl, wideImgUrl: null };
  }
  if (cleanName.includes("เทริยากิ")) {
    return { platedImgUrl: P("pork-teriyaki-diced.jpg"), packImgUrl, wideImgUrl: null };
  }
  return { platedImgUrl: P("pork-plated.jpg"), packImgUrl, wideImgUrl: null };
}

export function resolveProductDefaultImages(
  categorySlug: PriceSheetCategorySlug,
  cleanName: string
): ProductImageSet {
  switch (categorySlug) {
    case "ready-meal":
      return resolveReadyMealImage(cleanName);
    case "fish":
      return resolveFishImage(cleanName);
    case "chicken":
      return resolveChickenImage(cleanName);
    case "beef":
      return resolveBeefImage(cleanName);
    case "pork":
      return resolvePorkImage(cleanName);
  }
}
