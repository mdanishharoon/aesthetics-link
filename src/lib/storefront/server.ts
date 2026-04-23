import "server-only";

import { gql } from "@/lib/graphql/client";
import { GET_CATALOG_PRODUCTS, GET_PRODUCT_BY_SLUG } from "@/lib/graphql/queries";
import type {
  GQLProduct,
  GQLProductDetailResponse,
  GQLProductsResponse,
  GQLVariableProduct,
} from "@/lib/graphql/types";
import { getProductBySlug } from "@/data/product-enrichment";
import { getWooStoreBaseUrl } from "@/lib/storefront/config";
import { decodeEntities } from "@/lib/utils/text";
import {
  ACCENT_COLORS,
  DEFAULT_NAV_TOP,
  DEFAULT_NAV_CONCERNS,
  DEFAULT_NAV_BRANDS,
} from "@/lib/storefront/constants";
import type {
  StorefrontBaseProduct,
  StorefrontCatalogProduct,
  StorefrontDetailProduct,
  StorefrontNavLink,
  StorefrontNavigation,
  StorefrontOrderConfirmation,
  StorefrontVariableConfig,
  StorefrontVariationAttribute,
} from "@/lib/storefront/types";

// ── Types ──────────────────────────────────────────────────────────────────

type UnknownRecord = Record<string, unknown>;

type WooProductBrand = {
  id?: number;
  name?: string;
  slug?: string;
  count?: number;
  image?: string;
};

type WooCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
};

type WooStoreProduct = {
  id: number;
  slug: string;
  brands: WooProductBrand[];
};

// ── Shared utilities ───────────────────────────────────────────────────────

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as UnknownRecord;
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

function isPositiveOrUnknownCount(count: number | undefined): boolean {
  return typeof count !== "number" || count > 0;
}

function toShortName(name: string): string {
  return name.replace(/^aesthetics\s*link\s*/i, "").trim() || name;
}

function toSentence(value: string): string {
  const text = stripHtml(value);
  if (!text) {
    return "";
  }
  const firstSentence = text.split(/[.!?]/)[0]?.trim() ?? "";
  return firstSentence ? `${firstSentence}.` : text;
}

// ── GraphQL price / stock helpers ──────────────────────────────────────────

// WooGraphQL returns prices as formatted HTML strings (e.g. "£29.99" or
// "<span ...>$29.99</span>"). Strip tags and decode entities.
function stripGqlPrice(html: string | null | undefined): string | null {
  if (!html) {
    return null;
  }
  const stripped = decodeEntities(html.replace(/<[^>]*>/g, "")).trim();
  return stripped || null;
}

// WooGraphQL stockStatus enum values: IN_STOCK, OUT_OF_STOCK, ON_BACKORDER
function normalizeGqlStockStatus(status: string | null | undefined): string {
  if (!status) {
    return "instock";
  }
  return status.toLowerCase().replace(/_/g, "");
}

// Normalize a WooGraphQL attribute name to an ID string for use as a map key.
// "pa_color" → "pa_color", "attribute_pa_color" → "pa_color", "Color" → "color"
function toGqlAttributeId(name: string): string {
  return decodeEntities(name)
    .trim()
    .toLowerCase()
    .replace(/^attribute_/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Human-readable label from a taxonomy name: "pa_color" → "Color"
function humanizeGqlAttributeName(name: string): string {
  return decodeEntities(name)
    .trim()
    .replace(/^attribute_/, "")
    .replace(/^pa_/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// ── GraphQL product mappers ────────────────────────────────────────────────

function mapGQLToVariableConfig(product: GQLVariableProduct): StorefrontVariableConfig {
  const attributes: StorefrontVariationAttribute[] = product.attributes.nodes
    .filter((attr) => attr.variation !== false)
    .map((attr) => {
      const id = toGqlAttributeId(attr.name);
      const label = attr.label || humanizeGqlAttributeName(attr.name);
      const options = attr.options.map((opt) => ({ label: opt, value: opt }));
      return { id, label, apiName: attr.name, options };
    })
    .filter((attr) => attr.id && attr.options.length > 0);

  const defaults: Record<string, string> = {};
  for (const def of product.defaultAttributes?.nodes ?? []) {
    const id = toGqlAttributeId(def.name);
    if (id && def.value) {
      defaults[id] = def.value;
    }
  }
  for (const attr of attributes) {
    if (!defaults[attr.id] && attr.options.length > 0) {
      defaults[attr.id] = attr.options[0].value;
    }
  }

  const variations = product.variations.nodes.map((variation) => {
    const attrMap: Record<string, string> = {};
    for (const varAttr of variation.attributes.nodes) {
      const id = toGqlAttributeId(varAttr.name);
      if (id && varAttr.value) {
        attrMap[id] = varAttr.value;
      }
    }
    const stockStatus = normalizeGqlStockStatus(variation.stockStatus);
    return {
      id: variation.databaseId,
      attributes: attrMap,
      price: stripGqlPrice(variation.price),
      regularPrice: stripGqlPrice(variation.regularPrice),
      inStock: stockStatus !== "outofstock",
      stockStatus,
    };
  });

  return { isVariable: true, attributes, defaults, variations };
}

function makeDefaultProduct(
  id: number,
  slug: string,
  name: string,
  category: string,
  description: string,
  price: string,
  images: { hero: string; heroAlt: string; detail: string; detailAlt: string; texture: string },
): StorefrontBaseProduct {
  return {
    wooId: id,
    slug,
    name,
    shortName: toShortName(name),
    category,
    tagline: toSentence(description) || "Precision formulation for everyday skin health.",
    description,
    price,
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
    images,
    accentBg: ACCENT_COLORS[id % ACCENT_COLORS.length],
  };
}

function mapGQLToCatalogProduct(product: GQLProduct, index: number): StorefrontCatalogProduct {
  const enrichment = getProductBySlug(product.slug);
  const firstCategory = product.productCategories.nodes[0] ?? null;
  const brands = product.productBrands?.nodes ?? [];
  const primaryBrand = brands[0] ?? null;
  const categorySlugs = product.productCategories.nodes.map((c) => c.slug).filter(Boolean);

  // Both SimpleProduct and VariableProduct have price/stockStatus fields via inline fragments
  const raw = product as GQLProduct & {
    price?: string | null;
    regularPrice?: string | null;
    salePrice?: string | null;
    stockStatus?: string;
  };

  const price = stripGqlPrice(raw.price) ?? "";
  const regularPrice = stripGqlPrice(raw.regularPrice) ?? null;
  const salePrice = stripGqlPrice(raw.salePrice) ?? null;
  const stockStatus = normalizeGqlStockStatus(raw.stockStatus);
  const inStock = stockStatus !== "outofstock";
  const productType = product.type.toLowerCase();
  const hasOptions = productType === "variable";

  const description =
    stripHtml(product.shortDescription ?? product.description ?? "") ||
    enrichment?.description ||
    "High-performance skincare, formulated without compromise.";

  return {
    id: product.databaseId,
    slug: product.slug,
    name: product.name,
    shortName: toShortName(product.name),
    category: firstCategory?.name ?? "Skincare",
    categorySlug: firstCategory?.slug ?? slugify(firstCategory?.name ?? "skincare"),
    categorySlugs: categorySlugs.length > 0 ? categorySlugs : [slugify(firstCategory?.name ?? "skincare")],
    brand: primaryBrand?.name ?? null,
    brandSlug: primaryBrand?.slug ? slugify(primaryBrand.slug) : null,
    brandSlugs: brands.map((b) => slugify(b.slug)).filter(Boolean),
    tagline: enrichment?.tagline ?? toSentence(description),
    description,
    price,
    retailPrice: price,
    regularPrice,
    priceSource: "retail",
    hasDiscount: Boolean(salePrice && regularPrice),
    productType,
    hasOptions,
    inStock,
    stockStatus,
    stockMessage: inStock ? null : "Out of stock",
    image: product.image?.sourceUrl ?? "/images/offer.jpg",
    imageAlt: product.image?.altText ?? product.name,
    accentBg: enrichment?.accentBg ?? ACCENT_COLORS[index % ACCENT_COLORS.length],
  };
}

function mapGQLToDetailProduct(product: GQLProduct): StorefrontDetailProduct {
  const enrichment = getProductBySlug(product.slug);
  const raw = product as GQLProduct & {
    price?: string | null;
    regularPrice?: string | null;
    salePrice?: string | null;
    stockStatus?: string;
  };

  const price = stripGqlPrice(raw.price) ?? "";
  const regularPrice = stripGqlPrice(raw.regularPrice) ?? null;
  const salePrice = stripGqlPrice(raw.salePrice) ?? null;
  const stockStatus = normalizeGqlStockStatus(raw.stockStatus);
  const inStock = stockStatus !== "outofstock";
  const productType = product.type.toLowerCase();
  const isVariable = productType === "variable";
  const hasOptions = isVariable;

  const description =
    stripHtml(product.description ?? product.shortDescription ?? "") ||
    enrichment?.description ||
    "Clinically engineered skincare designed for visible results.";

  const galleryNodes = product.galleryImages.nodes;
  const heroSrc = product.image?.sourceUrl ?? galleryNodes[0]?.sourceUrl ?? "/images/offer.jpg";
  const detailSrc = galleryNodes[0]?.sourceUrl ?? heroSrc;
  const textureSrc = galleryNodes[1]?.sourceUrl ?? detailSrc;

  const images = {
    hero: heroSrc,
    heroAlt: product.image?.altText ?? product.name,
    detail: detailSrc ?? heroSrc,
    detailAlt: galleryNodes[0]?.altText ?? product.name,
    texture: textureSrc,
  };

  const base: StorefrontBaseProduct = enrichment
    ? {
        ...enrichment,
        wooId: product.databaseId,
      }
    : makeDefaultProduct(
        product.databaseId,
        product.slug,
        product.name,
        product.productCategories.nodes[0]?.name ?? "Skincare",
        description,
        price,
        images,
      );

  const variableConfig =
    isVariable ? mapGQLToVariableConfig(product as GQLVariableProduct) : null;

  return {
    ...base,
    wooId: product.databaseId,
    slug: product.slug,
    name: product.name,
    shortName: base.shortName || toShortName(product.name),
    category: product.productCategories.nodes[0]?.name ?? base.category,
    description,
    price,
    regularPrice,
    priceSource: "retail",
    hasDiscount: Boolean(salePrice && regularPrice),
    productType,
    hasOptions,
    variableConfig,
    inStock,
    stockStatus,
    stockMessage: inStock ? null : "Out of stock",
    images,
  };
}

// ── Navigation (Store API) ─────────────────────────────────────────────────

function normalizeWooTerm(input: unknown): WooProductBrand | null {
  const term = asRecord(input);
  if (!term) {
    return null;
  }

  const slug =
    (typeof term.slug === "string" && slugify(term.slug)) ||
    (typeof term.name === "string" && slugify(term.name)) ||
    "";
  const name =
    (typeof term.name === "string" && normalizeWhitespace(decodeEntities(term.name))) ||
    slug.replace(/-/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());

  if (!slug || !name) {
    return null;
  }

  const count =
    typeof term.count === "number"
      ? term.count
      : typeof term.count === "string" && Number.isFinite(Number(term.count))
        ? Number(term.count)
        : undefined;

  const imageValue = (() => {
    const image = term.image;
    if (typeof image === "string") {
      const src = image.trim();
      return src || undefined;
    }

    const imageRecord = asRecord(image);
    if (!imageRecord) {
      return undefined;
    }

    const candidates = [
      imageRecord.src,
      imageRecord.thumbnail,
      imageRecord.url,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return undefined;
  })();

  return {
    id: typeof term.id === "number" ? term.id : undefined,
    slug,
    name,
    count,
    image: imageValue,
  };
}

function normalizeWooTerms(input: unknown): WooProductBrand[] {
  if (!input) {
    return [];
  }

  const rawItems = Array.isArray(input) ? input : [input];
  const deduped = new Map<string, WooProductBrand>();

  for (const item of rawItems) {
    const term = normalizeWooTerm(item);
    if (!term || !term.slug) {
      continue;
    }
    deduped.set(term.slug, term);
  }

  return Array.from(deduped.values());
}

function normalizeWooStoreProduct(input: unknown): WooStoreProduct | null {
  const product = asRecord(input);
  if (!product) {
    return null;
  }

  const numericId =
    typeof product.id === "number"
      ? product.id
      : typeof product.id === "string" && Number.isFinite(Number(product.id))
        ? Number(product.id)
        : 0;
  const slug = typeof product.slug === "string" ? slugify(product.slug) : "";
  const brands = normalizeWooTerms(product.brands);

  if (!numericId || !slug) {
    return null;
  }

  return { id: numericId, slug, brands };
}

type WooProductBrandLookup = {
  byId: Map<number, WooProductBrand[]>;
  bySlug: Map<string, WooProductBrand[]>;
};

function toWooProductBrandLookup(input: unknown): WooProductBrandLookup | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const byId = new Map<number, WooProductBrand[]>();
  const bySlug = new Map<string, WooProductBrand[]>();

  for (const item of input) {
    const product = normalizeWooStoreProduct(item);
    if (!product || product.brands.length === 0) {
      continue;
    }

    byId.set(product.id, product.brands);
    bySlug.set(product.slug, product.brands);
  }

  return { byId, bySlug };
}

function mergeCatalogBrandsFromWooLookup(
  catalog: StorefrontCatalogProduct[],
  lookup: WooProductBrandLookup,
): StorefrontCatalogProduct[] {
  return catalog.map((product) => {
    const storeBrands = lookup.byId.get(product.id) ?? lookup.bySlug.get(slugify(product.slug)) ?? [];
    if (storeBrands.length === 0) {
      return product;
    }

    const normalizedStoreBrands = storeBrands
      .map((brand) => {
        const slug = slugify(brand.slug ?? brand.name ?? "");
        const name = typeof brand.name === "string" ? normalizeWhitespace(decodeEntities(brand.name)) : "";
        if (!slug) {
          return null;
        }
        return { slug, name: name || slug };
      })
      .filter((brand): brand is { slug: string; name: string } => Boolean(brand));

    if (normalizedStoreBrands.length === 0) {
      return product;
    }

    const primaryBrand = normalizedStoreBrands[0];
    const brandSlugs = Array.from(
      new Set([
        primaryBrand.slug,
        ...normalizedStoreBrands.map((brand) => brand.slug),
        ...(product.brandSlugs ?? []).map((slug) => slugify(slug)).filter(Boolean),
      ]),
    );

    return {
      ...product,
      brand: primaryBrand.name,
      brandSlug: primaryBrand.slug,
      brandSlugs,
    };
  });
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
    .filter(
      (category) =>
        categoryMatchesKeywords(category, keywords) && hasChildren(categories, category.id),
    )
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

function parseBrandPriorityOrder(): string[] {
  const raw = process.env.STOREFRONT_BRAND_ORDER ?? "";
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => slugify(entry))
    .filter(Boolean);
}

function getBrandSlugFromHref(href: string): string {
  try {
    const url = new URL(href, "https://storefront.local");
    return slugify(url.searchParams.get("brand") ?? "");
  } catch {
    return "";
  }
}

function applyBrandPriorityOrder(entries: StorefrontNavLink[]): StorefrontNavLink[] {
  const priorityOrder = parseBrandPriorityOrder();
  if (priorityOrder.length === 0) {
    return entries;
  }

  const rankBySlug = new Map<string, number>();
  priorityOrder.forEach((slug, index) => {
    if (!rankBySlug.has(slug)) {
      rankBySlug.set(slug, index);
    }
  });

  return [...entries].sort((left, right) => {
    const leftSlug = getBrandSlugFromHref(left.href);
    const rightSlug = getBrandSlugFromHref(right.href);
    const leftRank = rankBySlug.has(leftSlug) ? rankBySlug.get(leftSlug)! : Number.MAX_SAFE_INTEGER;
    const rightRank = rankBySlug.has(rightSlug) ? rankBySlug.get(rightSlug)! : Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
  });
}

function isDescendantOfRoot(
  categoryId: number,
  rootIds: Set<number>,
  parentById: Map<number, number>,
): boolean {
  const seen = new Set<number>();
  let current = parentById.get(categoryId) ?? 0;

  while (current > 0 && !seen.has(current)) {
    if (rootIds.has(current)) {
      return true;
    }
    seen.add(current);
    current = parentById.get(current) ?? 0;
  }

  return false;
}

function toCategoryDescendantLinks(
  categories: WooCategory[],
  rootIds: Set<number>,
  key: "concern" | "brand",
  options?: { leavesOnly?: boolean },
): StorefrontNavLink[] {
  if (rootIds.size === 0) {
    return [];
  }

  const parentById = new Map<number, number>();
  for (const category of categories) {
    parentById.set(category.id, category.parent);
  }

  const leavesOnly = options?.leavesOnly === true;

  return categories
    .filter((category) => {
      if (rootIds.has(category.id)) {
        return false;
      }
      if (!isDescendantOfRoot(category.id, rootIds, parentById)) {
        return false;
      }
      if (!isPositiveOrUnknownCount(category.count)) {
        return false;
      }
      if (leavesOnly && hasChildren(categories, category.id)) {
        return false;
      }
      return true;
    })
    .map((category) => ({
      label: category.name,
      href: buildFilterHref(key, category.slug),
    }));
}

function defaultNavigation(): StorefrontNavigation {
  return { top: DEFAULT_NAV_TOP, concerns: DEFAULT_NAV_CONCERNS, brands: DEFAULT_NAV_BRANDS };
}

async function fetchWooCategories(): Promise<WooCategory[] | null> {
  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const url = new URL("/wp-json/wc/store/v1/products/categories", baseUrl);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("hide_empty", "false");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300, tags: ["woo:categories"] },
  });

  if (!response.ok) {
    throw new Error(`Woo category request failed (${response.status})`);
  }

  return (await response.json()) as WooCategory[];
}

async function fetchWooBrands(): Promise<WooProductBrand[] | null> {
  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const url = new URL("/wp-json/wc/store/v1/products/brands", baseUrl);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("hide_empty", "false");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300, tags: ["woo:brands"] },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Woo brand request failed (${response.status})`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return null;
  }

  return normalizeWooTerms(payload);
}

async function fetchWooProductBrandLookup(): Promise<WooProductBrandLookup | null> {
  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const url = new URL("/wp-json/wc/store/v1/products", baseUrl);
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", "1");
  url.searchParams.set("hide_empty", "false");
  url.searchParams.set("_fields", "id,slug,brands");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300, tags: ["woo:products", "woo:brands"] },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Woo product brand request failed (${response.status})`);
  }

  const payload = await response.json();
  return toWooProductBrandLookup(payload);
}

export async function getOrderConfirmation(
  receiptToken: string | null | undefined,
): Promise<StorefrontOrderConfirmation | null> {
  const normalizedToken = typeof receiptToken === "string" ? receiptToken.trim() : "";
  const baseUrl = getWooStoreBaseUrl();

  if (!baseUrl || !normalizedToken) {
    return null;
  }

  const url = new URL("/wp-json/aesthetics-link/v1/orders/confirmation", baseUrl);
  url.searchParams.set("receipt", normalizedToken);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (response.status === 404 || response.status === 400) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Order confirmation request failed (${response.status})`);
  }

  const payload = (await response.json()) as StorefrontOrderConfirmation | null;
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload;
}

export async function getStorefrontNavigation(): Promise<StorefrontNavigation> {
  try {
    const [categories, storeBrands] = await Promise.all([fetchWooCategories(), fetchWooBrands()]);

    if (!categories || categories.length === 0) {
      return defaultNavigation();
    }

    const concernRootIds = findRootCategoryIds(categories, ["concern"]);
    const brandRootIds = findRootCategoryIds(categories, ["brand"]);

    let concerns = toCategoryDescendantLinks(categories, concernRootIds, "concern", {
      leavesOnly: true,
    });
    let brands: StorefrontNavLink[] =
      storeBrands?.flatMap((brand) => {
        const slug = typeof brand.slug === "string" ? brand.slug.trim() : "";
        const name =
          typeof brand.name === "string" ? normalizeWhitespace(decodeEntities(brand.name)) : "";

        if (!slug || !name || !isPositiveOrUnknownCount(brand.count)) {
          return [];
        }

        return [{ label: name, href: buildFilterHref("brand", slug), image: brand.image ?? null }];
      }) ?? [];

    if (brands.length === 0) {
      brands = toCategoryDescendantLinks(categories, brandRootIds, "brand", { leavesOnly: true });
    }

    concerns = toUniqueLinks(concerns);

    if (brands.length === 0) {
      brands = categories
        .filter(
          (category) =>
            categoryMatchesKeywords(category, ["brand"]) &&
            !hasChildren(categories, category.id) &&
            isPositiveOrUnknownCount(category.count),
        )
        .map((category) => ({
          label: category.name,
          href: buildFilterHref("brand", category.slug),
        }));
    }

    const uniqueBrands = applyBrandPriorityOrder(toUniqueLinks(brands));

    return {
      top: DEFAULT_NAV_TOP,
      concerns: concerns.slice(0, 8),
      brands: uniqueBrands.length > 0 ? uniqueBrands.slice(0, 12) : DEFAULT_NAV_BRANDS,
    };
  } catch {
    return defaultNavigation();
  }
}

// ── Product exports (GraphQL-based) ───────────────────────────────────────

export async function getCatalogProducts(options?: {
  brand?: string;
}): Promise<StorefrontCatalogProduct[]> {
  try {
    // No status/orderby filter — WooGraphQL returns published products by default.
    // Orderby enum values vary by WooGraphQL version; omit to use WooCommerce defaults.
    const response = await gql<GQLProductsResponse>(
      GET_CATALOG_PRODUCTS,
      { first: 100 },
      { tags: ["woo:products"], revalidate: 300 },
    );

    if (response.errors?.length) {
      console.error("[GraphQL] getCatalogProducts errors:", JSON.stringify(response.errors));
    }

    const nodes = response.data?.products?.nodes ?? [];

    if (nodes.length === 0) {
      return [];
    }

    const mapped = nodes.map(mapGQLToCatalogProduct);
    let catalog = mapped;

    try {
      const wooBrandLookup = await fetchWooProductBrandLookup();
      if (wooBrandLookup) {
        catalog = mergeCatalogBrandsFromWooLookup(mapped, wooBrandLookup);
      }
    } catch (lookupError) {
      console.warn("[GraphQL] brand enrichment skipped:", lookupError);
    }

    // Client-side brand filter — GraphQL taxonomy filters vary by plugin setup.
    if (options?.brand) {
      const brandSlug = slugify(options.brand);
      if (!brandSlug) {
        return [];
      }
      return catalog.filter(
        (product) =>
          product.brandSlug === brandSlug ||
          (product.brandSlugs ?? []).some((s) => s === brandSlug),
      );
    }

    return catalog;
  } catch (err) {
    console.error("[GraphQL] getCatalogProducts failed:", err);
    return [];
  }
}

export async function getDetailProductBySlug(slug: string): Promise<StorefrontDetailProduct | null> {
  try {
    const response = await gql<GQLProductDetailResponse>(
      GET_PRODUCT_BY_SLUG,
      { slug },
      { tags: ["woo:products", `woo:product:${slug}`], revalidate: 300 },
    );

    if (response.errors?.length) {
      console.error(`[GraphQL] getDetailProductBySlug(${slug}) errors:`, JSON.stringify(response.errors));
    }

    const product = response.data?.product ?? null;

    if (!product) {
      return null;
    }

    return mapGQLToDetailProduct(product);
  } catch (err) {
    console.error(`[GraphQL] getDetailProductBySlug(${slug}) failed:`, err);
    return null;
  }
}
