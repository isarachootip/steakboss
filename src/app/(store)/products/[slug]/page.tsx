import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, listCatalogProducts } from "@/services/product.service";
import { ProductDetailView } from "@/components/store/ProductDetailView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "ไม่พบสินค้า" };
  return {
    title: `${product.name} (${product.weightGrams}g)`,
    description: product.description,
    openGraph: {
      title: `${product.name} — Steakboss`,
      description: product.description,
      images: [product.wideImgUrl || product.platedImgUrl],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, allProducts] = await Promise.all([
    getProductBySlug(slug),
    listCatalogProducts(),
  ]);

  if (!product) notFound();

  const related = allProducts.filter((p) => p.id !== product.id).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    offers: {
      "@type": "Offer",
      priceCurrency: "THB",
      price: product.priceBaht,
      availability:
        product.availableStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailView product={product} related={related} />
    </>
  );
}
