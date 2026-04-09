import "server-only";

import { getProductBySlug, products as fallbackProducts, type Product } from "@/data/products";
import { getWooStoreBaseUrl } from "@/lib/storefront/config";
import type {
  StorefrontCatalogProduct,
  StorefrontDetailProduct,
  StorefrontNavLink,
  StorefrontNavigation,
} from "@/lib/storefront/types";

type WooImage = {
  src?: string;
  alt?: string;
};

type WooProductCategory = {
  id?: number;
  name?: string;
  slug?: string;
};

type WooCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
};

type WooProductPrices = {
  currency_code?: string;
  currency_symbol?: string;
  currency_minor_unit?: number;
  currency_prefix?: string;
  currency_suffix?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
};

type WooAddToCart = {
  text?: string;
  description?: string;
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
  is_in_stock?: boolean;
  is_purchasable?: boolean;
  stock_status?: string;
  add_to_cart?: WooAddToCart;
};

const ACCENT_COLORS = ["#F1CCCF", "#D8D0C4", "#D3E5EF", "#E8DFC8"];
const DEFAULT_NAV_TOP = [
  { label: "All Products", href: "/products" },
  { label: "Bestsellers", href: "/products?sort=bestsellers" },
  { label: "New Arrivals", href: "/products?sort=new" },
];
const DEFAULT_NAV_CONCERNS = [
  { label: "Brightening", href: "/products?concern=brightening-moisturiser" },
  { label: "Hydration", href: "/products?concern=hydration-serum" },
  { label: "Anti-Ageing", href: "/products?concern=overnight-treatment" },
  { label: "SPF Protection", href: "/products?concern=uv-protection" },
  { label: "Eye Care", href: "/products?concern=eye-treatment" },
  { label: "Targeted Treatment", href: "/products?concern=targeted-treatment" },
];
const DEFAULT_NAV_BRANDS = [
  { label: "Lumiere Atelier", href: "/products?brand=lumiere-atelier" },
  { label: "Botan Botanics", href: "/products?brand=botan-botanics" },
  { label: "Clinis Lab", href: "/products?brand=clinis-lab" },
  { label: "Velour Skin", href: "/products?brand=velour-skin" },
  { label: "Verdant", href: "/products?brand=verdant" },
  { label: "Eclat London", href: "/products?brand=eclat-london" },
];

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

function slugify(value: string): string {
  return decodeEntities(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripHtml(value: string): string {
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isWooProductInStock(product: WooProduct): boolean {
  if (typeof product.is_in_stock === "boolean") {
    return product.is_in_stock;
  }

  const rawStatus = product.stock_status?.trim().toLowerCase();
  if (rawStatus) {
    return rawStatus !== "outofstock";
  }

  if (typeof product.is_purchasable === "boolean") {
    return product.is_purchasable;
  }

  return true;
}

function getWooStockStatus(product: WooProduct): string {
  return (product.stock_status?.trim().toLowerCase() || (isWooProductInStock(product) ? "instock" : "outofstock"));
}

function getWooStockMessage(product: WooProduct): string | null {
  if (isWooProductInStock(product)) {
    return null;
  }

  const fromApi = normalizeWhitespace(
    decodeEntities(product.add_to_cart?.description ?? "").replace(/<[^>]*>/g, " "),
  );

  if (!fromApi) {
    return "Out of stock";
  }

  // Woo often returns generic CTA copy here (e.g. "Read more about ..."),
  // which is confusing when we need an explicit stock state message.
  if (/^read more\b/i.test(fromApi) || /^select options\b/i.test(fromApi)) {
    return "Out of stock";
  }

  return fromApi;
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
    categorySlug: slugify(product.category),
    categorySlugs: [slugify(product.category)],
    tagline: product.tagline,
    description: product.description,
    price: product.price,
    retailPrice: product.price,
    inStock: true,
    stockStatus: "instock",
    stockMessage: null,
    image: product.images.hero,
    imageAlt: product.images.heroAlt,
    accentBg: product.accentBg,
  }));
}

function mapWooToCatalogProduct(product: WooProduct, index: number): StorefrontCatalogProduct {
  const fallback = getProductBySlug(product.slug);
  const firstCategoryName = product.categories?.[0]?.name ?? fallback?.category ?? "Skincare";
  const firstCategorySlug = product.categories?.[0]?.slug ?? slugify(firstCategoryName);
  const categorySlugs = (product.categories ?? [])
    .map((category) => category.slug ?? slugify(category.name ?? ""))
    .filter((value) => value.length > 0);
  const uniqueCategorySlugs = Array.from(new Set(categorySlugs.length > 0 ? categorySlugs : [firstCategorySlug]));
  const description =
    stripHtml(product.short_description ?? product.description ?? "") ||
    fallback?.description ||
    "High-performance skincare, formulated without compromise.";
  const inStock = isWooProductInStock(product);
  const stockStatus = getWooStockStatus(product);
  const stockMessage = getWooStockMessage(product);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortName: fallback?.shortName ?? toShortName(product.name),
    category: firstCategoryName,
    categorySlug: firstCategorySlug,
    categorySlugs: uniqueCategorySlugs,
    tagline: fallback?.tagline ?? toSentence(description),
    description,
    price: toPriceLabel(product.prices) || fallback?.price || "",
    retailPrice: toPriceLabel(product.prices) || fallback?.price || "",
    regularPrice: toPriceLabel({
      ...product.prices,
      price: product.prices?.regular_price,
    }),
    priceSource: "retail",
    hasDiscount: Boolean(product.prices?.sale_price && product.prices?.regular_price),
    inStock,
    stockStatus,
    stockMessage,
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

function defaultNavigation(): StorefrontNavigation {
  return {
    top: DEFAULT_NAV_TOP,
    concerns: DEFAULT_NAV_CONCERNS,
    brands: DEFAULT_NAV_BRANDS,
  };
}

async function fetchWooCategories(): Promise<WooCategory[] | null> {
  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const url = new URL("/wp-json/wc/store/v1/products/categories", baseUrl);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 300,
      tags: ["woo:categories"],
    },
  });

  if (!response.ok) {
    throw new Error(`Woo category request failed (${response.status})`);
  }

  return (await response.json()) as WooCategory[];
}

function buildFilterHref(key: "concern" | "brand", slug: string): string {
  return `/products?${key}=${encodeURIComponent(slug)}`;
}

function normalizeMatchToken(value: string): string {
  return decodeEntities(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function categoryMatchesKeywords(category: WooCategory, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return false;
  }

  const haystack = `${normalizeMatchToken(category.slug)} ${normalizeMatchToken(category.name)}`;
  return keywords.some((keyword) => haystack.includes(keyword));
}

function hasChildren(categories: WooCategory[], categoryId: number): boolean {
  return categories.some((candidate) => candidate.parent === categoryId);
}

function findRootCategoryIds(categories: WooCategory[], keywords: string[]): Set<number> {
  const topLevelMatches = categories
    .filter((category) => category.parent === 0 && categoryMatchesKeywords(category, keywords))
    .map((category) => category.id);

  if (topLevelMatches.length > 0) {
    return new Set(topLevelMatches);
  }

  const nestedMatches = categories
    .filter((category) => categoryMatchesKeywords(category, keywords) && hasChildren(categories, category.id))
    .map((category) => category.id);

  return new Set(nestedMatches);
}

function toUniqueLinks(entries: StorefrontNavLink[]): StorefrontNavLink[] {
  const deduped = new Map<string, StorefrontNavLink>();
  for (const entry of entries) {
    if (!entry.label || !entry.href || deduped.has(entry.href)) {
      continue;
    }
    deduped.set(entry.href, entry);
  }
  return Array.from(deduped.values());
}

function toCategoryChildrenLinks(
  categories: WooCategory[],
  rootIds: Set<number>,
  key: "concern" | "brand",
): StorefrontNavLink[] {
  return categories
    .filter((category) => rootIds.has(category.parent) && (category.count ?? 0) > 0)
    .map((category) => ({
      label: category.name,
      href: buildFilterHref(key, category.slug),
    }));
}

export async function getStorefrontNavigation(): Promise<StorefrontNavigation> {
  try {
    const categories = await fetchWooCategories();
    if (!categories || categories.length === 0) {
      return defaultNavigation();
    }

    const concernRootIds = findRootCategoryIds(categories, ["concern"]);
    const brandRootIds = findRootCategoryIds(categories, ["brand"]);

    let concerns = toCategoryChildrenLinks(categories, concernRootIds, "concern");
    let brands = toCategoryChildrenLinks(categories, brandRootIds, "brand");

    if (concerns.length === 0) {
      const excluded = new Set<number>([...concernRootIds, ...brandRootIds]);
      for (const category of categories) {
        if (excluded.has(category.id)) {
          continue;
        }

        if (brandRootIds.has(category.parent)) {
          continue;
        }

        if (hasChildren(categories, category.id) || (category.count ?? 0) <= 0) {
          continue;
        }

        if (categoryMatchesKeywords(category, ["brand"])) {
          continue;
        }

        concerns.push({
          label: category.name,
          href: buildFilterHref("concern", category.slug),
        });
      }
    }

    concerns = toUniqueLinks(concerns);
    if (brands.length === 0) {
      brands = categories
        .filter(
          (category) =>
            categoryMatchesKeywords(category, ["brand"]) &&
            !hasChildren(categories, category.id) &&
            (category.count ?? 0) > 0,
        )
        .map((category) => ({
          label: category.name,
          href: buildFilterHref("brand", category.slug),
        }));
    }

    const uniqueBrands = toUniqueLinks(brands);

    return {
      top: DEFAULT_NAV_TOP,
      concerns: concerns.slice(0, 8),
      brands: uniqueBrands.length > 0 ? uniqueBrands.slice(0, 12) : DEFAULT_NAV_BRANDS,
    };
  } catch {
    return defaultNavigation();
  }
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
    regularPrice: toPriceLabel({
      ...product.prices,
      price: product.prices?.regular_price,
    }),
    priceSource: "retail",
    hasDiscount: Boolean(product.prices?.sale_price && product.prices?.regular_price),
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
  const inStock = isWooProductInStock(product);
  const stockStatus = getWooStockStatus(product);
  const stockMessage = getWooStockMessage(product);

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
    regularPrice:
      toPriceLabel({
        ...product.prices,
        price: product.prices?.regular_price,
      }) || fallbackOrDefault.regularPrice,
    priceSource: "retail",
    hasDiscount: Boolean(product.prices?.sale_price && product.prices?.regular_price),
    inStock,
    stockStatus,
    stockMessage,
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
