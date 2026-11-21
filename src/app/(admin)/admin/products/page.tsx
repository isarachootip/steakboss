import { getSession } from "@/lib/auth/session";
import { listAdminProducts } from "@/services/product.service";
import { listCategories } from "@/services/settings.service";
import { ProductsManager } from "@/components/admin/ProductsManager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const session = await getSession();
  const includeCost = session?.role === "OWNER";
  const canEdit = session?.role === "OWNER" || session?.role === "ADMIN";
  const [products, categories] = await Promise.all([
    listAdminProducts(includeCost),
    listCategories(),
  ]);

  return (
    <ProductsManager
      initialProducts={products}
      categories={categories}
      includeCost={includeCost}
      canEdit={canEdit}
    />
  );
}
