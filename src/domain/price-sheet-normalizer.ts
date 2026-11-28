import crypto from "node:crypto";
import { resolveProductDefaultImages } from "./product-image-map";

export type PriceSheetCategorySlug =
  | "pork"
  | "beef"
  | "chicken"
  | "fish"
  | "ready-meal";

export function parseCsvRows(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

export function normalizeProductTitle(raw: string): string {
  return raw
    .replace(/สเต๊กหมุ/g, "สเต๊กหมู")
    .replace(/สเต๊ก\./g, "สเต๊ก")
    .replace(/ใส้กรอก/g, "ไส้กรอก")
    .replace(/เส้นสปาเกตตี\b/g, "เส้นสปาเก็ตตี้")
    .replace(/(ตุ๋น)([A-Z])(\d+\s*[gG]\.?)/g, "$1 $2")
    .replace(/([ก-๙])(PREMIUM|BIG|CAPA|SNPS|KP|KB|KM|PM|PS|A3|K|M|P|B)(?![A-Za-z])/g, "$1 $2")
    .replace(/(ซอส)(\d+)(ชนิด)/g, "$1 $2 $3")
    .replace(/(ถุงละ)\s*(\d+)\s*(ชิ้น|ไม้)/g, "$1 $2 $3")
    .replace(/\(\s*1\s*ชุดมี\s*2\s*ชิ้น\s*\)/g, "(1 ชุดมี 2 ชิ้น)")
    .replace(/\s*\+\s*/g, "+")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectPackInfo(rawName: string): {
  packSize: number;
  multiplier: number;
  unitWord: string;
} {
  const bagMatch = rawName.match(/ถุงละ\s*(\d+)\s*(ชิ้น|ไม้)/);
  if (bagMatch) {
    const n = Number(bagMatch[1]);
    return { packSize: n, multiplier: n, unitWord: bagMatch[2]! };
  }
  const setMatch = rawName.match(/1\s*ชุดมี\s*(\d+)\s*ชิ้น/);
  if (setMatch) {
    return { packSize: Number(setMatch[1]), multiplier: 1, unitWord: "ชิ้น" };
  }
  return { packSize: 1, multiplier: 1, unitWord: "ชิ้น" };
}

export function extractSubtitle(
  cleanName: string,
  packSize: number,
  multiplier: number,
  unitWord: string,
  rawPieceGrams: number,
  rawWholesaleBaht: number
): string {
  const modMatch = cleanName.match(/(ย่างญี่ปุ่น\s*แถม[^()]+|แถม[^()]+|หมัก[^()]+)/);
  const mod = modMatch ? modMatch[1]!.trim() : "พร้อมปรุงแช่แข็ง -18°C";
  if (multiplier > 1 && rawWholesaleBaht > 0) {
    return `แพ็คถุงละ ${packSize} ${unitWord} (${rawPieceGrams}g/${unitWord}) · ส่งเฉลี่ย ฿${rawWholesaleBaht}/${unitWord}`;
  }
  if (packSize > 1) {
    return `${mod} · 1 ชุดมี ${packSize} ชิ้น`;
  }
  return mod;
}

const CANONICAL_SLUGS: Array<{ match: (cat: PriceSheetCategorySlug, key: string) => boolean; slug: string }> = [
  {
    match: (cat, k) => cat === "pork" && k.includes("พอร์คชอปkpหมักพริกไทยดำ"),
    slug: "pork-chop-kp",
  },
  {
    match: (cat, k) => cat === "pork" && k.includes("หมูนุ่มbigหมักพริกไทยดำ"),
    slug: "tender-pork-big",
  },
  {
    match: (cat, k) => cat === "chicken" && k.includes("ไก่นุ่มbigหมักพริกไทยดำ"),
    slug: "chicken-steak-big",
  },
  {
    match: (cat, k) => cat === "chicken" && k.includes("ไก่คลีนpหมักพริกไทยดำ"),
    slug: "easy-clean-chicken-p",
  },
];

export function buildDeterministicIds(
  categorySlug: PriceSheetCategorySlug,
  cleanName: string,
  weightGrams: number,
  needsWeightSuffix: boolean
): { slug: string; sku: string } {
  const compactKey = cleanName.toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  const canonical = CANONICAL_SLUGS.find((c) => c.match(categorySlug, compactKey));
  const hashInput = `${categorySlug}:${compactKey}:${needsWeightSuffix ? weightGrams : ""}`;
  const hex = crypto.createHash("sha1").update(hashInput).digest("hex").slice(0, 6);
  const prefixMap: Record<PriceSheetCategorySlug, string> = {
    pork: "PK",
    beef: "BF",
    chicken: "CK",
    fish: "FS",
    "ready-meal": "RM",
  };
  const sku = `SB-${prefixMap[categorySlug]}-${hex.toUpperCase()}`;
  const slug = canonical
    ? canonical.slug
    : `${categorySlug}-${hex}${needsWeightSuffix ? `-${weightGrams}g` : ""}`;
  return { slug, sku };
}

export function resolveDefaultImages(
  categorySlug: PriceSheetCategorySlug,
  cleanName: string
): { platedImgUrl: string; packImgUrl: string; wideImgUrl: string | null } {
  return resolveProductDefaultImages(categorySlug, cleanName);
}
