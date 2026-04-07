import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDetailProductBySlug } from "@/lib/storefront/server";
import ProductDetail from "./ProductDetail";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getDetailProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} — AestheticsLink`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getDetailProductBySlug(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
