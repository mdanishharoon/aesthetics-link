import "server-only";

import { getProductBySlug, products as fallbackProducts, type Product } from "@/data/products";
import { getWooStoreBaseUrl } from "@/lib/storefront/config";
import type {
  StorefrontCatalogProduct,
  StorefrontDetailProduct,
  StorefrontNavLink,
  StorefrontNavigation,
  StorefrontVariableConfig,
  StorefrontVariationAttribute,
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

type WooProductBrand = {
  id?: number;
  name?: string;
  slug?: string;
  count?: number;
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
  type?: string;
  has_options?: boolean;
  short_description?: string;
  description?: string;
  images?: WooImage[];
  categories?: WooProductCategory[];
  prices?: WooProductPrices;
  is_in_stock?: boolean;
  is_purchasable?: boolean;
  stock_status?: string;
  add_to_cart?: WooAddToCart;
  brands?: WooProductBrand[];
  brand?: WooProductBrand[] | WooProductBrand | string;
};

type UnknownRecord = Record<string, unknown>;

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

  return {
    id: typeof term.id === "number" ? term.id : undefined,
    slug,
    name,
    count,
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

function getProductBrands(product: WooProduct): WooProductBrand[] {
  const fromKnownFields = normalizeWooTerms(product.brands);

  const rawProduct = asRecord(product);
  const fromFallbackFields = normalizeWooTerms(
    rawProduct?.brand ?? rawProduct?.product_brands ?? rawProduct?.product_brand,
  );

  const deduped = new Map<string, WooProductBrand>();
  for (const term of [...fromKnownFields, ...fromFallbackFields]) {
    if (!term.slug) {
      continue;
    }
    deduped.set(term.slug, term);
  }

  return Array.from(deduped.values());
}

function toVariationId(value: string): string {
  return decodeEntities(value)
    .trim()
    .toLowerCase()
    .replace(/^attribute_/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueVariationOptions(
  options: Array<{ label: string; value: string }>,
): Array<{ label: string; value: string }> {
  const deduped = new Map<string, { label: string; value: string }>();
  for (const option of options) {
    if (!option.value || deduped.has(option.value)) {
      continue;
    }
    deduped.set(option.value, option);
  }
  return Array.from(deduped.values());
}

function parseVariationAttributes(rawProduct: UnknownRecord): StorefrontVariationAttribute[] {
  const attributesRaw = Array.isArray(rawProduct.attributes) ? rawProduct.attributes : [];

  const fromProduct = attributesRaw
    .map((entry) => {
      const attribute = asRecord(entry);
      if (!attribute) {
        return null;
      }

      const label =
        (typeof attribute.name === "string" && decodeEntities(attribute.name).trim()) ||
        (typeof attribute.taxonomy === "string" && decodeEntities(attribute.taxonomy).trim()) ||
        "Option";
      const apiName =
        (typeof attribute.taxonomy === "string" && attribute.taxonomy.trim()) ||
        (typeof attribute.slug === "string" && attribute.slug.trim()) ||
        (typeof attribute.name === "string" && attribute.name.trim()) ||
        "";
      const id = toVariationId(apiName || label);

      if (!id || !apiName) {
        return null;
      }

      let options: Array<{ label: string; value: string }> = [];

      if (Array.isArray(attribute.terms)) {
        options = attribute.terms
          .map((termRaw) => {
            const term = asRecord(termRaw);
            if (!term) {
              return null;
            }

            const optionLabel =
              (typeof term.name === "string" && decodeEntities(term.name).trim()) || "";
            const optionValue =
              (typeof term.slug === "string" && term.slug.trim()) ||
              (typeof term.name === "string" && term.name.trim()) ||
              "";

            if (!optionLabel || !optionValue) {
              return null;
            }

            return {
              label: optionLabel,
              value: optionValue,
            };
          })
          .filter((option): option is { label: string; value: string } => option !== null);
      } else if (Array.isArray(attribute.options)) {
        options = attribute.options
          .map((optionRaw) => {
            if (typeof optionRaw !== "string") {
              return null;
            }
            const clean = decodeEntities(optionRaw).trim();
            if (!clean) {
              return null;
            }
            return {
              label: clean,
              value: optionRaw.trim(),
            };
          })
          .filter((option): option is { label: string; value: string } => option !== null);
      }

      return {
        id,
        label,
        apiName,
        options: uniqueVariationOptions(options),
      };
    })
    .filter((attribute): attribute is StorefrontVariationAttribute => attribute !== null);

  if (fromProduct.length > 0) {
    return fromProduct.filter((attribute) => attribute.options.length > 0);
  }

  const variationsRaw = Array.isArray(rawProduct.variations) ? rawProduct.variations : [];
  const attributesById = new Map<string, StorefrontVariationAttribute>();

  for (const variationRaw of variationsRaw) {
    const variation = asRecord(variationRaw);
    if (!variation) {
      continue;
    }

    const attrsRaw = variation.attributes;
    if (Array.isArray(attrsRaw)) {
      for (const entryRaw of attrsRaw) {
        const entry = asRecord(entryRaw);
        if (!entry) {
          continue;
        }
        const apiName =
          (typeof entry.attribute === "string" && entry.attribute.trim()) ||
          (typeof entry.name === "string" && entry.name.trim()) ||
          "";
        const optionValue = typeof entry.value === "string" ? entry.value.trim() : "";

        if (!apiName || !optionValue) {
          continue;
        }

        const id = toVariationId(apiName);
        const current = attributesById.get(id) ?? {
          id,
          label: decodeEntities(apiName.replace(/^pa_/, "").replace(/_/g, " ")).trim(),
          apiName,
          options: [],
        };
        current.options = uniqueVariationOptions([
          ...current.options,
          { label: decodeEntities(optionValue), value: optionValue },
        ]);
        attributesById.set(id, current);
      }
      continue;
    }

    const attrsObject = asRecord(attrsRaw);
    if (!attrsObject) {
      continue;
    }

    for (const [rawKey, rawValue] of Object.entries(attrsObject)) {
      if (typeof rawValue !== "string" || !rawValue.trim()) {
        continue;
      }

      const apiName = rawKey.trim();
      if (!apiName) {
        continue;
      }

      const id = toVariationId(apiName);
      const current = attributesById.get(id) ?? {
        id,
        label: decodeEntities(apiName.replace(/^pa_/, "").replace(/_/g, " ")).trim(),
        apiName,
        options: [],
      };
      current.options = uniqueVariationOptions([
        ...current.options,
        { label: decodeEntities(rawValue.trim()), value: rawValue.trim() },
      ]);
      attributesById.set(id, current);
    }
  }

  return Array.from(attributesById.values()).filter((attribute) => attribute.options.length > 0);
}

function parseVariationDefaults(
  rawProduct: UnknownRecord,
  attributes: StorefrontVariationAttribute[],
): Record<string, string> {
  const defaults: Record<string, string> = {};
  const rawDefaults = rawProduct.default_attributes;

  if (Array.isArray(rawDefaults)) {
    for (const entryRaw of rawDefaults) {
      const entry = asRecord(entryRaw);
      if (!entry) {
        continue;
      }

      const keyRaw =
        (typeof entry.attribute === "string" && entry.attribute.trim()) ||
        (typeof entry.name === "string" && entry.name.trim()) ||
        (typeof entry.taxonomy === "string" && entry.taxonomy.trim()) ||
        "";
      const valueRaw =
        (typeof entry.value === "string" && entry.value.trim()) ||
        (typeof entry.option === "string" && entry.option.trim()) ||
        "";

      if (!keyRaw || !valueRaw) {
        continue;
      }

      defaults[toVariationId(keyRaw)] = valueRaw;
    }
  } else {
    const defaultsObj = asRecord(rawDefaults);
    if (defaultsObj) {
      for (const [rawKey, rawValue] of Object.entries(defaultsObj)) {
        if (typeof rawValue !== "string" || !rawValue.trim()) {
          continue;
        }
        defaults[toVariationId(rawKey)] = rawValue.trim();
      }
    }
  }

  for (const attribute of attributes) {
    if (!defaults[attribute.id] && attribute.options.length > 0) {
      defaults[attribute.id] = attribute.options[0].value;
    }
  }

  return defaults;
}

function extractVariableConfig(rawProduct: UnknownRecord): StorefrontVariableConfig | null {
  const type = typeof rawProduct.type === "string" ? rawProduct.type.trim().toLowerCase() : "";
  const hasOptions = Boolean(rawProduct.has_options);
  const isVariable = type === "variable" || hasOptions;

  if (!isVariable) {
    return null;
  }

  const attributes = parseVariationAttributes(rawProduct);
  const defaults = parseVariationDefaults(rawProduct, attributes);

  return {
    isVariable: true,
    attributes,
    defaults,
  };
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
    brand: null,
    brandSlug: null,
    brandSlugs: [],
    tagline: product.tagline,
    description: product.description,
    price: product.price,
    retailPrice: product.price,
    productType: "simple",
    hasOptions: false,
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
  const brands = getProductBrands(product);
  const firstCategoryName = product.categories?.[0]?.name ?? fallback?.category ?? "Skincare";
  const firstCategorySlug = product.categories?.[0]?.slug ?? slugify(firstCategoryName);
  const categorySlugs = (product.categories ?? [])
    .map((category) => category.slug ?? slugify(category.name ?? ""))
    .filter((value) => value.length > 0);
  const uniqueCategorySlugs = Array.from(new Set(categorySlugs.length > 0 ? categorySlugs : [firstCategorySlug]));
  const brandSlugs = Array.from(
    new Set(
      brands
        .map((brand) => brand.slug ?? "")
        .map((slug) => slugify(slug))
        .filter((slug) => slug.length > 0),
    ),
  );
  const primaryBrand =
    brands.find((brand) => {
      const slug = slugify(brand.slug ?? "");
      return slug.length > 0;
    }) ?? null;
  const description =
    stripHtml(product.short_description ?? product.description ?? "") ||
    fallback?.description ||
    "High-performance skincare, formulated without compromise.";
  const inStock = isWooProductInStock(product);
  const stockStatus = getWooStockStatus(product);
  const stockMessage = getWooStockMessage(product);
  const productType = product.type?.trim().toLowerCase();
  const hasOptions = Boolean(product.has_options) || productType === "variable";

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    shortName: fallback?.shortName ?? toShortName(product.name),
    category: firstCategoryName,
    categorySlug: firstCategorySlug,
    categorySlugs: uniqueCategorySlugs,
    brand: primaryBrand?.name ?? null,
    brandSlug: primaryBrand?.slug ? slugify(primaryBrand.slug) : null,
    brandSlugs,
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
    productType,
    hasOptions,
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

async function fetchWooProductById(
  productId: number,
  slugForTag?: string,
): Promise<UnknownRecord | null> {
  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl || productId <= 0) {
    return null;
  }

  const url = new URL(`/wp-json/wc/store/v1/products/${productId}`, baseUrl);
  const tags = ["woo:products", `woo:product-id:${productId}`];
  if (slugForTag) {
    tags.push(`woo:product:${slugForTag}`);
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
    return null;
  }

  const data = (await response.json()) as unknown;
  return asRecord(data);
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

async function fetchWooBrands(): Promise<WooProductBrand[] | null> {
  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const url = new URL("/wp-json/wc/store/v1/products/brands", baseUrl);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 300,
      tags: ["woo:brands"],
    },
  });

  // Some Woo stores do not expose brand terms via Store API.
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
    .filter((category) => rootIds.has(category.parent) && isPositiveOrUnknownCount(category.count))
    .map((category) => ({
      label: category.name,
      href: buildFilterHref(key, category.slug),
    }));
}

export async function getStorefrontNavigation(): Promise<StorefrontNavigation> {
  try {
    const [categories, storeBrands] = await Promise.all([fetchWooCategories(), fetchWooBrands()]);
    if (!categories || categories.length === 0) {
      return defaultNavigation();
    }

    const concernRootIds = findRootCategoryIds(categories, ["concern"]);
    const brandRootIds = findRootCategoryIds(categories, ["brand"]);

    let concerns = toCategoryChildrenLinks(categories, concernRootIds, "concern");
    let brands =
      storeBrands?.flatMap((brand) => {
        const slug = typeof brand.slug === "string" ? brand.slug.trim() : "";
        const name =
          typeof brand.name === "string" ? normalizeWhitespace(decodeEntities(brand.name)) : "";

        if (!slug || !name || !isPositiveOrUnknownCount(brand.count)) {
          return [];
        }

        return [{ label: name, href: buildFilterHref("brand", slug) }];
      }) ?? [];

    if (brands.length === 0) {
      brands = toCategoryChildrenLinks(categories, brandRootIds, "brand");
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

function mapWooToDetailProduct(
  product: WooProduct,
  variableConfig: StorefrontVariableConfig | null = null,
): StorefrontDetailProduct {
  const fallback = getProductBySlug(product.slug);
  const fallbackOrDefault = fallback ?? defaultDetailFromWoo(product);
  const inStock = isWooProductInStock(product);
  const stockStatus = getWooStockStatus(product);
  const stockMessage = getWooStockMessage(product);
  const productType = product.type?.trim().toLowerCase();
  const hasOptions = Boolean(product.has_options) || productType === "variable";

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
    productType,
    hasOptions,
    variableConfig,
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

export async function getCatalogProducts(options?: {
  brand?: string;
}): Promise<StorefrontCatalogProduct[]> {
  try {
    const data = await fetchWooProducts({
      per_page: "100",
      orderby: "menu_order",
      order: "asc",
      ...(options?.brand ? { brand: options.brand } : {}),
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

    const product = data[0];
    const isVariable =
      product.type?.trim().toLowerCase() === "variable" || Boolean(product.has_options);
    let variableConfig: StorefrontVariableConfig | null = null;

    if (isVariable && product.id > 0) {
      const productDetail = await fetchWooProductById(product.id, product.slug);
      if (productDetail) {
        variableConfig = extractVariableConfig(productDetail);
      }
    }

    return mapWooToDetailProduct(product, variableConfig);
  } catch {
    return getProductBySlug(slug) ?? null;
  }
}
