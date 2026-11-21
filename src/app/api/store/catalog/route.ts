import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/services/product.service";
import { getStoreSettings, listCategories } from "@/services/settings.service";

export async function GET() {
  const [products, categories, settings] = await Promise.all([
    listCatalogProducts(),
    listCategories(),
    getStoreSettings(),
  ]);

  return NextResponse.json({
    products,
    categories,
    settings: {
      bkkShipBaht: settings.bkkShipBaht,
      upcShipBaht: settings.upcShipBaht,
      freeShipThreshold: settings.freeShipThreshold,
      codFeeBaht: settings.codFeeBaht,
      phone: settings.phone,
      lineId: settings.lineId,
      lineOaUrl: settings.lineOaUrl,
      promptpayId: settings.promptpayId,
      promptpayName: settings.promptpayName,
      facebookPage: settings.facebookPage,
    },
  });
}
