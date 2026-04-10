"use client";

import type {
  StorefrontCart,
  StorefrontCheckoutPayload,
  StorefrontCheckoutResponse,
  StorefrontVariableConfig,
  StorefrontVariationAttribute,
} from "@/lib/storefront/types";

type RawPrice = {
  currency_symbol?: string;
  currency_prefix?: string;
  currency_suffix?: string;
  currency_minor_unit?: number;
  price?: string;
};

type RawTotals = {
  currency_symbol?: string;
  currency_prefix?: string;
  currency_suffix?: string;
  currency_minor_unit?: number;
  total_items?: string;
  total_shipping?: string;
  total_tax?: string;
  total_price?: string;
};

type RawCartItem = {
  key: string;
  id?: number;
  slug?: string;
  name?: string;
  quantity?: number;
  images?: Array<{ src?: string; alt?: string }>;
  variation?: unknown;
  prices?: RawPrice;
  totals?: {
    line_total?: string;
  };
};

type RawCart = {
  items?: RawCartItem[];
  items_count?: number;
  needs_shipping?: boolean;
  totals?: RawTotals;
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

function formatMoney(rawValue: string | undefined, money: Partial<RawPrice & RawTotals>): string {
  const minorUnits = Number.isFinite(money.currency_minor_unit) ? Number(money.currency_minor_unit) : 2;
  const numeric = Number(rawValue ?? "0");
  const amount = Number.isFinite(numeric)
    ? String(rawValue ?? "").includes(".")
      ? numeric
      : numeric / 10 ** minorUnits
    : 0;
  const symbol = decodeEntities(money.currency_prefix ?? money.currency_symbol ?? "$");
  const suffix = decodeEntities(money.currency_suffix ?? "");
  return `${symbol}${amount.toFixed(minorUnits)}${suffix}`;
}

function normalizeStoreErrorMessage(value: string): string {
  const normalized = decodeEntities(value).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Store API request failed.";
  }

  if (/out of stock|insufficient stock|not enough stock|cannot add/i.test(normalized)) {
    return "This product is out of stock and cannot be added to your bag.";
  }

  if (/missing attributes|choose product options|select options|please choose/i.test(normalized)) {
    return "Please select all required product options before adding to bag.";
  }

  return normalized;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toId(value: string): string {
  return decodeEntities(value)
    .trim()
    .toLowerCase()
    .replace(/^attribute_/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeVariationValue(value: string): string {
  return decodeEntities(value).trim().toLowerCase();
}

function humanizeVariationLabel(value: string): string {
  const cleaned = decodeEntities(value)
    .trim()
    .replace(/^attribute_/, "")
    .replace(/^pa_/, "")
    .replace(/[_-]+/g, " ");
  return cleaned ? cleaned.replace(/\b\w/g, (match) => match.toUpperCase()) : "Option";
}

function uniqueOptions(options: Array<{ label: string; value: string }>): Array<{ label: string; value: string }> {
  const deduped = new Map<string, { label: string; value: string }>();
  for (const option of options) {
    if (!option.value || deduped.has(option.value)) {
      continue;
    }
    deduped.set(option.value, option);
  }
  return Array.from(deduped.values());
}

function toPriceLabelFromRaw(raw: unknown): string | null {
  const prices = asRecord(raw);
  if (!prices) {
    return null;
  }

  const rawValue = typeof prices.price === "string" ? prices.price : null;
  if (!rawValue) {
    return null;
  }

  return formatMoney(rawValue, {
    currency_minor_unit:
      typeof prices.currency_minor_unit === "number" ? prices.currency_minor_unit : undefined,
    currency_prefix:
      typeof prices.currency_prefix === "string" ? prices.currency_prefix : undefined,
    currency_symbol:
      typeof prices.currency_symbol === "string" ? prices.currency_symbol : undefined,
    currency_suffix:
      typeof prices.currency_suffix === "string" ? prices.currency_suffix : undefined,
  });
}

function parseVariationEntryAttributes(rawAttributes: unknown): Record<string, string> {
  const attributes: Record<string, string> = {};

  if (Array.isArray(rawAttributes)) {
    for (const attributeRaw of rawAttributes) {
      const attribute = asRecord(attributeRaw);
      if (!attribute) {
        continue;
      }

      // Prefer taxonomy (e.g. "pa_color") over name (e.g. "Color") as the key so it
      // matches the parent product attribute id without extra normalisation.
      const keyRaw =
        (typeof attribute.attribute === "string" && attribute.attribute.trim()) ||
        (typeof attribute.taxonomy === "string" && attribute.taxonomy.trim()) ||
        (typeof attribute.name === "string" && attribute.name.trim()) ||
        "";

      let valueRaw =
        (typeof attribute.value === "string" && attribute.value.trim()) ||
        (typeof attribute.option === "string" && attribute.option.trim()) ||
        "";

      // Store API returns variation attributes as { terms: [{ slug, name }] } with no
      // value/option field. When there is exactly one term it is the selected value for
      // this variation.
      if (!valueRaw && Array.isArray(attribute.terms) && attribute.terms.length === 1) {
        const term = asRecord(attribute.terms[0]);
        if (term) {
          valueRaw =
            (typeof term.slug === "string" && term.slug.trim()) ||
            (typeof term.name === "string" && term.name.trim()) ||
            "";
        }
      }

      if (!keyRaw || !valueRaw) {
        continue;
      }

      attributes[toId(keyRaw)] = valueRaw;
    }

    return attributes;
  }

  const attributesObject = asRecord(rawAttributes);
  if (!attributesObject) {
    return attributes;
  }

  for (const [rawKey, rawValue] of Object.entries(attributesObject)) {
    if (typeof rawValue !== "string" || !rawValue.trim()) {
      continue;
    }
    attributes[toId(rawKey)] = rawValue.trim();
  }

  return attributes;
}

function parseVariationEntries(rawProduct: Record<string, unknown>): StorefrontVariableConfig["variations"] {
  const variationsRaw = Array.isArray(rawProduct.variations) ? rawProduct.variations : [];
  const parsed: StorefrontVariableConfig["variations"] = [];

  for (const variationRaw of variationsRaw) {
    const variation = asRecord(variationRaw);
    if (!variation) {
      continue;
    }

    const attributes = parseVariationEntryAttributes(variation.attributes);
    if (Object.keys(attributes).length === 0) {
      continue;
    }

    const prices = asRecord(variation.prices);
    const price =
      toPriceLabelFromRaw(prices) ||
      (typeof variation.price === "string" ? decodeEntities(variation.price).trim() : null);
    const regularPrice =
      toPriceLabelFromRaw(prices ? { ...prices, price: prices.regular_price } : null) ||
      (typeof variation.regular_price === "string"
        ? decodeEntities(variation.regular_price).trim()
        : null);
    const inStock =
      typeof variation.is_in_stock === "boolean"
        ? variation.is_in_stock
        : typeof variation.stock_status === "string"
          ? variation.stock_status.trim().toLowerCase() !== "outofstock"
          : null;

    parsed.push({
      id: typeof variation.id === "number" ? variation.id : undefined,
      attributes,
      price,
      regularPrice,
      inStock,
      stockStatus:
        typeof variation.stock_status === "string" ? variation.stock_status.trim().toLowerCase() : null,
    });
  }

  return parsed;
}

function parseCartItemVariations(input: unknown): Array<{ label: string; value: string }> {
  const parsed: Array<{ label: string; value: string }> = [];

  if (Array.isArray(input)) {
    for (const entryRaw of input) {
      const entry = asRecord(entryRaw);
      if (!entry) {
        continue;
      }

      const labelRaw =
        (typeof entry.attribute_name === "string" && entry.attribute_name.trim()) ||
        (typeof entry.name === "string" && entry.name.trim()) ||
        (typeof entry.attribute === "string" && entry.attribute.trim()) ||
        (typeof entry.key === "string" && entry.key.trim()) ||
        "";
      const valueRaw =
        (typeof entry.value === "string" && entry.value.trim()) ||
        (typeof entry.option === "string" && entry.option.trim()) ||
        (typeof entry.display === "string" && entry.display.trim()) ||
        "";

      if (!labelRaw || !valueRaw) {
        continue;
      }

      parsed.push({
        label: humanizeVariationLabel(labelRaw),
        value: decodeEntities(valueRaw).trim(),
      });
    }
  } else {
    const variationObject = asRecord(input);
    if (!variationObject) {
      return parsed;
    }

    for (const [rawKey, rawValue] of Object.entries(variationObject)) {
      if (typeof rawValue !== "string" || !rawValue.trim()) {
        continue;
      }

      parsed.push({
        label: humanizeVariationLabel(rawKey),
        value: decodeEntities(rawValue).trim(),
      });
    }
  }

  const deduped = new Map<string, { label: string; value: string }>();
  for (const entry of parsed) {
    const dedupeKey = `${normalizeVariationValue(entry.label)}::${normalizeVariationValue(entry.value)}`;
    if (deduped.has(dedupeKey)) {
      continue;
    }
    deduped.set(dedupeKey, entry);
  }

  return Array.from(deduped.values());
}

function parseVariationAttributes(rawProduct: Record<string, unknown>): StorefrontVariationAttribute[] {
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
      const id = toId(apiName || label);

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
            const labelValue = decodeEntities(optionRaw).trim();
            if (!labelValue) {
              return null;
            }
            return { label: labelValue, value: optionRaw.trim() };
          })
          .filter((option): option is { label: string; value: string } => option !== null);
      }

      return {
        id,
        label,
        apiName,
        options: uniqueOptions(options),
      };
    })
    .filter((attribute): attribute is StorefrontVariationAttribute => attribute !== null);

  const variationsRaw = Array.isArray(rawProduct.variations) ? rawProduct.variations : [];

  if (fromProduct.length === 0) {
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

          const id = toId(apiName);
          const current = attributesById.get(id) ?? {
            id,
            label: decodeEntities(apiName.replace(/^pa_/, "").replace(/_/g, " ")).trim(),
            apiName,
            options: [],
          };

          current.options = uniqueOptions([
            ...current.options,
            { label: decodeEntities(optionValue), value: optionValue },
          ]);
          attributesById.set(id, current);
        }
      } else {
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
          const id = toId(apiName);
          const current = attributesById.get(id) ?? {
            id,
            label: decodeEntities(apiName.replace(/^pa_/, "").replace(/_/g, " ")).trim(),
            apiName,
            options: [],
          };
          current.options = uniqueOptions([
            ...current.options,
            { label: decodeEntities(rawValue.trim()), value: rawValue.trim() },
          ]);
          attributesById.set(id, current);
        }
      }
    }

    return Array.from(attributesById.values()).filter((attribute) => attribute.options.length > 0);
  }

  if (variationsRaw.length === 0) {
    return fromProduct.filter((attribute) => attribute.options.length > 0);
  }

  const optionsByAttribute = new Map<string, Array<{ label: string; value: string }>>();
  for (const attribute of fromProduct) {
    optionsByAttribute.set(attribute.id, [...attribute.options]);
  }

  for (const variationRaw of variationsRaw) {
    const variation = asRecord(variationRaw);
    if (!variation) {
      continue;
    }

    const attrsRaw = variation.attributes;
    if (!Array.isArray(attrsRaw)) {
      continue;
    }

    for (const entryRaw of attrsRaw) {
      const entry = asRecord(entryRaw);
      if (!entry) {
        continue;
      }
      const attrName =
        (typeof entry.attribute === "string" && entry.attribute.trim()) ||
        (typeof entry.name === "string" && entry.name.trim()) ||
        "";
      const attrValue = typeof entry.value === "string" ? entry.value.trim() : "";
      if (!attrName || !attrValue) {
        continue;
      }

      const key = toId(attrName);
      const existing = optionsByAttribute.get(key) ?? [];
      optionsByAttribute.set(
        key,
        uniqueOptions([...existing, { label: decodeEntities(attrValue), value: attrValue }]),
      );
    }
  }

  return fromProduct
    .map((attribute) => ({
      ...attribute,
      options: uniqueOptions(optionsByAttribute.get(attribute.id) ?? attribute.options),
    }))
    .filter((attribute) => attribute.options.length > 0);
}

function parseVariationDefaults(
  rawProduct: Record<string, unknown>,
  attributes: StorefrontVariationAttribute[],
): Record<string, string> {
  const defaults: Record<string, string> = {};
  const rawDefaults = rawProduct.default_attributes;

  if (!rawDefaults) {
    return defaults;
  }

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

      defaults[toId(keyRaw)] = valueRaw;
    }
  } else {
    const defaultsObj = asRecord(rawDefaults);
    if (defaultsObj) {
      for (const [keyRaw, valueRaw] of Object.entries(defaultsObj)) {
        if (typeof valueRaw !== "string" || !valueRaw.trim()) {
          continue;
        }
        defaults[toId(keyRaw)] = valueRaw.trim();
      }
    }
  }

  for (const attribute of attributes) {
    if (defaults[attribute.id]) {
      continue;
    }
    if (attribute.options.length > 0) {
      defaults[attribute.id] = attribute.options[0].value;
    }
  }

  return defaults;
}

async function requestStoreApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/woo${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload &&
      "message" in payload &&
      typeof (payload as { message?: string }).message === "string"
        ? normalizeStoreErrorMessage((payload as { message: string }).message)
        : `Store API request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function mapRawCart(rawCart: RawCart): StorefrontCart {
  const totals = rawCart.totals ?? {};
  const items = (rawCart.items ?? []).map((item, index) => {
    const priceContext = item.prices ?? totals;
    const name = item.name ?? "Product";
    return {
      key: item.key,
      productId: item.id ?? 0,
      slug: item.slug ?? `item-${item.key}`,
      name,
      shortName: name,
      quantity: item.quantity ?? 1,
      price: formatMoney(item.prices?.price, priceContext),
      lineTotal: formatMoney(item.totals?.line_total ?? item.prices?.price, priceContext),
      variations: parseCartItemVariations(item.variation),
      image: item.images?.[0]?.src ?? "/images/offer.jpg",
      imageAlt: item.images?.[0]?.alt ?? name,
      accentBg: ACCENT_COLORS[index % ACCENT_COLORS.length],
    };
  });

  return {
    items,
    itemCount: rawCart.items_count ?? items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: formatMoney(totals.total_items, totals),
    shipping: formatMoney(totals.total_shipping, totals),
    tax: formatMoney(totals.total_tax, totals),
    total: formatMoney(totals.total_price, totals),
    currencySymbol: decodeEntities(totals.currency_prefix ?? totals.currency_symbol ?? "$"),
    needsShipping: Boolean(rawCart.needs_shipping),
  };
}

type WooAjaxVariationResponse = {
  found?: boolean;
  display_price?: number;
  display_regular_price?: number;
  is_in_stock?: boolean;
  price_html?: string;
};

function parsePriceHtml(html: string): { price: string; regularPrice: string | null } {
  const stripTags = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
  const insMatch = /<ins[^>]*>([\s\S]*?)<\/ins>/i.exec(html);
  const delMatch = /<del[^>]*>([\s\S]*?)<\/del>/i.exec(html);
  if (insMatch && delMatch) {
    return { price: stripTags(insMatch[1]), regularPrice: stripTags(delMatch[1]) };
  }
  return { price: stripTags(html), regularPrice: null };
}

export async function lookupVariationPrice(
  productId: number,
  attributes: Array<{ apiName: string; value: string }>,
): Promise<{ price: string; regularPrice: string | null; inStock: boolean } | null> {
  const body = new URLSearchParams();
  body.set("action", "get_variation");
  body.set("product_id", String(productId));
  for (const { apiName, value } of attributes) {
    const key = apiName.startsWith("attribute_") ? apiName : `attribute_${apiName}`;
    body.set(key, value);
  }

  const response = await fetch("/api/woo-ajax", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json().catch(() => null)) as WooAjaxVariationResponse | null;
  if (!data || data.found === false) {
    return null;
  }

  if (!data.price_html) {
    return null;
  }

  const { price, regularPrice } = parsePriceHtml(data.price_html);
  if (!price) {
    return null;
  }

  return { price, regularPrice, inStock: data.is_in_stock ?? true };
}

export async function fetchCart(): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart");
  return mapRawCart(raw);
}

export async function addCartItem(productId: number, quantity = 1): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart/add-item", {
    method: "POST",
    body: JSON.stringify({ id: productId, quantity }),
  });
  return mapRawCart(raw);
}

export async function addVariableCartItem(
  productId: number,
  variation: Array<{ attribute: string; value: string }>,
  quantity = 1,
): Promise<StorefrontCart> {
  const sanitizedVariation = variation
    .map((entry) => ({
      attribute: entry.attribute.trim(),
      value: entry.value.trim(),
    }))
    .filter((entry) => entry.attribute && entry.value);

  const raw = await requestStoreApi<RawCart>("/cart/add-item", {
    method: "POST",
    body: JSON.stringify({
      id: productId,
      quantity,
      ...(sanitizedVariation.length > 0 ? { variation: sanitizedVariation } : {}),
    }),
  });
  return mapRawCart(raw);
}

export async function fetchVariableConfig(productId: number): Promise<StorefrontVariableConfig> {
  const raw = await requestStoreApi<unknown>(`/products/${productId}`);
  const product = asRecord(raw);

  if (!product) {
    return {
      isVariable: false,
      attributes: [],
      defaults: {},
      variations: [],
    };
  }

  const type = typeof product.type === "string" ? product.type.trim().toLowerCase() : "";
  const hasOptions = Boolean(product.has_options);
  const isVariable = type === "variable" || hasOptions;

  if (!isVariable) {
    return {
      isVariable: false,
      attributes: [],
      defaults: {},
      variations: [],
    };
  }

  const attributes = parseVariationAttributes(product);
  const defaults = parseVariationDefaults(product, attributes);

  // The Store API returns variations as an array of IDs, not full objects.
  // Detect this case and fetch each variation individually to get prices.
  const variationsRaw = Array.isArray(product.variations) ? product.variations : [];
  const variationIds = variationsRaw.filter((v): v is number => typeof v === "number");

  let variations: StorefrontVariableConfig["variations"];
  if (variationIds.length > 0) {
    const fetched = await Promise.all(
      variationIds.map(async (id) => {
        try {
          const data = await requestStoreApi<unknown>(`/products/${id}`);
          return asRecord(data);
        } catch {
          return null;
        }
      }),
    );
    variations = fetched
      .filter((v): v is Record<string, unknown> => v !== null)
      .flatMap((v) => parseVariationEntries({ variations: [v] }));
  } else {
    variations = parseVariationEntries(product);
  }

  return {
    isVariable: true,
    attributes,
    defaults,
    variations,
  };
}

export async function updateCartItemQuantity(key: string, quantity: number): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart/update-item", {
    method: "POST",
    body: JSON.stringify({ key, quantity }),
  });
  return mapRawCart(raw);
}

export async function removeCartItem(key: string): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart/remove-item", {
    method: "POST",
    body: JSON.stringify({ key }),
  });
  return mapRawCart(raw);
}

export async function submitCheckout(
  payload: StorefrontCheckoutPayload,
): Promise<StorefrontCheckoutResponse> {
  const raw = await requestStoreApi<Record<string, unknown>>("/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const paymentResult = (raw.payment_result ?? {}) as Record<string, unknown>;
  const redirectUrl = (paymentResult.redirect_url ?? raw.redirect_url) as string | undefined;
  const status = (paymentResult.payment_status ?? raw.status ?? "success") as string;
  const orderId = (raw.order_id ?? raw.id) as number | undefined;

  return {
    status,
    redirectUrl,
    orderId,
    raw,
  };
}
