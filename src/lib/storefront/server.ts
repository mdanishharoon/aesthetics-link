import "server-only";

import { getProductBySlug, products as fallbackProducts, type Product } from "@/data/products";
import { getWooStoreBaseUrl } from "@/lib/storefront/config";
import type { StorefrontCatalogProduct, StorefrontDetailProduct } from "@/lib/storefront/types";

type WooImage = {
  src?: string;
  alt?: string;
};

type WooProductCategory = {
  name?: string;
};

type WooProductPrices = {
  currency_code?: string;
  currency_symbol?: string;
  currency_minor_unit?: number;
  currency_prefix?: string;
  currency_suffix?: string;
  price?: string;
};

type WooProduct = {
  id: number;
  slug: string;
  name: string;
  short_description?: string;
  description?: string;
  images?: WooImage[];
  categories?: WooProductCategory[];
  prices?: WooProductPrices;
};

const ACCENT_COLORS = ["#F1CCCF", "#D8D0C4", "#D3E5EF", "#E8DFC8"];

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&pound;/g, "£")
    .replace(/&dollar;/g, "$")
    .replace(/&euro;/g, "€");
}

function stripHtml(value: string): string {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSentence(value: string): string {
  const text = stripHtml(value);
  if (!text) {
    return "";
  }

  const firstSentence = text.split(/[.!?]/)[0]?.trim() ?? "";
  return firstSentence ? `${firstSentence}.` : text;
}

function toPriceLabel(prices?: WooProductPrices): string {
  if (!prices?.price) {
    return "";
  }

  const rawValue = String(prices.price);
  const minorUnits = Number.isFinite(prices.currency_minor_unit)
    ? Number(prices.currency_minor_unit)
    : 2;
  const numeric = Number(rawValue);

  if (!Number.isFinite(numeric)) {
    return rawValue;
  }

  const amount = rawValue.includes(".") ? numeric : numeric / 10 ** minorUnits;
  const symbol = decodeEntities(prices.currency_prefix ?? prices.currency_symbol ?? "");
  const suffix = decodeEntities(prices.currency_suffix ?? "");
  const normalized = amount.toFixed(minorUnits);

  if (symbol || suffix) {
    return `${symbol}${normalized}${suffix}`;
  }

  if (prices.currency_code) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: prices.currency_code,
      }).format(amount);
    } catch {
      return normalized;
    }
  }

  return normalized;
}

function toShortName(name: string): string {
  return name.replace(/^aesthetics\s*link\s*/i, "").trim() || name;
}

function toCatalogFallback(): StorefrontCatalogProduct[] {
  return fallbackProducts.map((product) => ({
    id: product.wooId ?? 0,
    slug: product.slug,
    name: product.name,
    shortName: product.shortName,
    category: product.category,
    tagline: product.tagline,
    description: product.description,
    price: product.price,
    image: product.images.hero,
    imageAlt: product.images.heroAlt,
    accentBg: product.accentBg,
  }));
}

function mapWooToCatalogProduct(product: WooProduct, index: number): StorefrontCatalogProduct {
  const fallback = getProductBySlug(product.slug);
  const description =
    stripHtml(product.short_description ?? product.description ?? "") ||
    fallback?.description ||
    "High-performance skincare, formulated without compromise.";

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortName: fallback?.shortName ?? toShortName(product.name),
    category: product.categories?.[0]?.name ?? fallback?.category ?? "Skincare",
    tagline: fallback?.tagline ?? toSentence(description),
    description,
    price: toPriceLabel(product.prices) || fallback?.price || "",
    image: product.images?.[0]?.src ?? fallback?.images.hero ?? "/images/offer.jpg",
    imageAlt: product.images?.[0]?.alt ?? fallback?.images.heroAlt ?? product.name,
    accentBg: fallback?.accentBg ?? ACCENT_COLORS[index % ACCENT_COLORS.length],
  };
}

async function fetchWooProducts(params: Record<string, string>): Promise<WooProduct[] | null> {
  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const url = new URL("/wp-json/wc/store/v1/products", baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const tags = ["woo:products"];
  if (params.slug) {
    tags.push(`woo:product:${params.slug}`);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 300,
      tags,
    },
  });

  if (!response.ok) {
    throw new Error(`Woo product request failed (${response.status})`);
  }

  return (await response.json()) as WooProduct[];
}

function defaultDetailFromWoo(product: WooProduct): Product {
  const description =
    stripHtml(product.description ?? product.short_description ?? "") ||
    "Clinically engineered skincare designed for visible results.";
  const shortName = toShortName(product.name);
  const firstImage = product.images?.[0]?.src ?? "/images/offer.jpg";
  const secondImage = product.images?.[1]?.src ?? firstImage;
  const thirdImage = product.images?.[2]?.src ?? firstImage;
  const category = product.categories?.[0]?.name ?? "Skincare";

  return {
    wooId: product.id,
    slug: product.slug,
    name: product.name,
    shortName,
    category,
    tagline: toSentence(description) || "Precision formulation for everyday skin health.",
    description,
    price: toPriceLabel(product.prices),
    claim: {
      headline: "FORMULATED.",
      headlineSerif: "for results",
      sub: "Built for real-world consistency.",
    },
    benefits: [
      {
        icon: "/images/icon-highest-standards.svg",
        title: "Targeted Formula",
        desc: "Ingredient profile selected to support visible, measurable skin improvements.",
      },
      {
        icon: "/images/icon-radical-transparency.svg",
        title: "Transparent Composition",
        desc: "Key actives and functions are clearly communicated for informed product use.",
      },
      {
        icon: "/images/icon-potent-multi-tasking.svg",
        title: "Daily-Compatible",
        desc: "Designed for routine use and layering with complementary treatments.",
      },
      {
        icon: "/images/icon-conscious-responsible.svg",
        title: "Skin-First Finish",
        desc: "Balanced texture and performance with comfort across skin types.",
      },
    ],
    keyIngredients: [
      { name: "Core Actives", desc: "Performance ingredients selected for efficacy and tolerance" },
      { name: "Barrier Support", desc: "Components chosen to maintain skin comfort during use" },
      { name: "Hydration Base", desc: "Humectants and emollients that support hydration balance" },
      { name: "Antioxidant Support", desc: "Protective compounds to reduce environmental stress impact" },
    ],
    howToUse: [
      "Apply to clean skin as directed on your treatment plan.",
      "Use a controlled amount and spread evenly across the target area.",
      "Follow with moisturizer and daytime UV protection where applicable.",
      "Maintain consistent use for best visible results.",
    ],
    images: {
      hero: firstImage,
      heroAlt: product.images?.[0]?.alt ?? product.name,
      detail: secondImage,
      detailAlt: product.images?.[1]?.alt ?? product.name,
      texture: thirdImage,
    },
    accentBg: ACCENT_COLORS[product.id % ACCENT_COLORS.length],
  };
}

function mapWooToDetailProduct(product: WooProduct): StorefrontDetailProduct {
  const fallback = getProductBySlug(product.slug);
  const fallbackOrDefault = fallback ?? defaultDetailFromWoo(product);

  return {
    ...fallbackOrDefault,
    wooId: product.id,
    slug: product.slug,
    name: product.name,
    shortName: fallbackOrDefault.shortName || toShortName(product.name),
    category: product.categories?.[0]?.name ?? fallbackOrDefault.category,
    description:
      stripHtml(product.description ?? product.short_description ?? "") ||
      fallbackOrDefault.description,
    price: toPriceLabel(product.prices) || fallbackOrDefault.price,
    images: {
      hero: product.images?.[0]?.src ?? fallbackOrDefault.images.hero,
      heroAlt: product.images?.[0]?.alt ?? fallbackOrDefault.images.heroAlt,
      detail: product.images?.[1]?.src ?? product.images?.[0]?.src ?? fallbackOrDefault.images.detail,
      detailAlt:
        product.images?.[1]?.alt ?? product.images?.[0]?.alt ?? fallbackOrDefault.images.detailAlt,
      texture:
        product.images?.[2]?.src ??
        product.images?.[1]?.src ??
        product.images?.[0]?.src ??
        fallbackOrDefault.images.texture,
    },
  };
}

export async function getCatalogProducts(): Promise<StorefrontCatalogProduct[]> {
  try {
    const data = await fetchWooProducts({
      per_page: "100",
      orderby: "menu_order",
      order: "asc",
    });

    if (!data) {
      return toCatalogFallback();
    }

    return data.map(mapWooToCatalogProduct);
  } catch {
    return toCatalogFallback();
  }
}

export async function getDetailProductBySlug(slug: string): Promise<StorefrontDetailProduct | null> {
  try {
    const data = await fetchWooProducts({ slug });

    if (!data || data.length === 0) {
      return getProductBySlug(slug) ?? null;
    }

    return mapWooToDetailProduct(data[0]);
  } catch {
    return getProductBySlug(slug) ?? null;
  }
}
