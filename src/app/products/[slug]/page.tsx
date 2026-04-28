import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDetailProductBySlug, getCatalogProducts } from "@/lib/storefront/server";
import { SITE_NAME, toAbsoluteUrl } from "@/lib/site";
import ProductDetail from "./ProductDetail";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getDetailProductBySlug(slug);
  if (!product) return {};
  const canonicalPath = `/products/${product.slug}`;
  return {
    title: product.name,
    description: product.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      url: toAbsoluteUrl(canonicalPath),
      siteName: SITE_NAME,
      title: product.name,
      description: product.description,
      images: product.images?.detail
        ? [
            {
              url: product.images.detail,
              alt: product.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description,
      images: product.images?.detail ? [product.images.detail] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, catalog] = await Promise.all([
    getDetailProductBySlug(slug),
    getCatalogProducts(),
  ]);
  if (!product) notFound();
  const related = catalog.filter((p) => p.slug !== slug).slice(0, 4);
  return <ProductDetail product={product} related={related} />;
}
