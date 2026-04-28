import type { MetadataRoute } from "next";
import { getCatalogProducts } from "@/lib/storefront/server";
import { toAbsoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: toAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: toAbsoluteUrl("/products"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: toAbsoluteUrl("/_about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const products = await getCatalogProducts();
  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: toAbsoluteUrl(`/products/${product.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
    images: product.image ? [product.image] : undefined,
  }));

  return [...staticRoutes, ...productRoutes];
}
