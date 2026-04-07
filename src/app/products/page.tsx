import ProductsClient from "@/app/products/ProductsClient";
import { getCatalogProducts } from "@/lib/storefront/server";

type Props = {
  searchParams: Promise<{ category?: string }>;
};

export const revalidate = 300;

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const catalog = await getCatalogProducts();

  const requestedCategory = params.category;
  const normalizedRequestedCategory =
    typeof requestedCategory === "string" ? requestedCategory : undefined;

  const initialCategory =
    normalizedRequestedCategory &&
    catalog.some((product) => product.category === normalizedRequestedCategory)
      ? normalizedRequestedCategory
      : "All";

  return <ProductsClient initialProducts={catalog} initialCategory={initialCategory} />;
}
