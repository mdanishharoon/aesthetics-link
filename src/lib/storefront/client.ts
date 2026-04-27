"use client";

import { z } from "zod";

import {
  StorefrontCartSchema,
  StorefrontOrderLookupResultSchema,
  StorefrontProductReviewsResponseSchema,
  type StorefrontCart,
  type StorefrontOrderLookupResult,
  type StorefrontProductReviewsResponse,
} from "@/types";
import { decodeEntities } from "@/lib/utils/text";
import { pickAccentColor } from "@/lib/storefront/constants";
import {
  WooClientError,
  extractErrorMessage,
  runSchema,
  wooFetch,
} from "@/lib/woo-client";

const ReviewSubmitResponseSchema = z.object({
  ok: z.boolean().optional(),
  pendingModeration: z.boolean().optional(),
  message: z.string().optional(),
});

// ── Raw Store API types ─────────────────────────────────────────────────────

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

// ── Utilities ──────────────────────────────────────────────────────────────

const CART_CACHE_KEY = "al_storefront_cart_snapshot_v1";

function formatMoney(rawValue: string | undefined, money: Partial<RawPrice & RawTotals>): string {
  const minorUnits = Number.isFinite(money.currency_minor_unit)
    ? Number(money.currency_minor_unit)
    : 2;
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

function humanizeVariationLabel(value: string): string {
  const cleaned = decodeEntities(value)
    .trim()
    .replace(/^attribute_/, "")
    .replace(/^pa_/, "")
    .replace(/[_-]+/g, " ");
  return cleaned ? cleaned.replace(/\b\w/g, (match) => match.toUpperCase()) : "Option";
}

function normalizeVariationValue(value: string): string {
  return decodeEntities(value).trim().toLowerCase();
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

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function saveCachedCartSnapshot(cart: StorefrontCart): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cart));
  } catch {
    // Ignore storage write failures (private mode/quota/security policy).
  }
}

export function clearCachedCartSnapshot(): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(CART_CACHE_KEY);
  } catch {
    // Ignore storage write failures (private mode/quota/security policy).
  }
}

export function getCachedCartSnapshot(): StorefrontCart | null {
  if (!canUseStorage()) {
    return null;
  }

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CART_CACHE_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearCachedCartSnapshot();
    return null;
  }

  const result = StorefrontCartSchema.safeParse(parsed);
  if (!result.success) {
    // Cached snapshot was written by an older schema or got corrupted; drop it.
    clearCachedCartSnapshot();
    return null;
  }
  return result.data;
}

// ── Store API client ───────────────────────────────────────────────────────

function isNonceErrorPayload(payload: unknown): boolean {
  const message = extractErrorMessage(payload) ?? "";
  const record = asRecord(payload);
  const code = record && typeof record.code === "string" ? record.code : "";
  return /nonce/i.test(message) || /nonce/i.test(code);
}

async function refreshNonce(): Promise<void> {
  // A GET to /cart causes WooCommerce to return a fresh Nonce response header,
  // which the proxy stores as the woo_nonce_token cookie for the next mutation.
  try {
    await fetch("/api/woo/cart", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    // Best-effort — if this fails the retry below will also fail with the real error.
  }
}

function isMutation(method: string | undefined): boolean {
  return Boolean(method) && method !== "GET" && method !== "HEAD";
}

async function requestStoreApi<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  try {
    return await wooFetch<T>(
      `/api/woo${path}`,
      {
        cache: "no-store",
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      },
      {
        context: `${init?.method ?? "GET"} /api/woo${path}`,
        onUpstreamError: (payload, response) => {
          const raw = extractErrorMessage(payload);
          throw new WooClientError(
            raw ? normalizeStoreErrorMessage(raw) : `Store API request failed (${response.status})`,
            response.status,
          );
        },
      },
    );
  } catch (error) {
    if (
      !retried &&
      isMutation(init?.method) &&
      error instanceof WooClientError &&
      (error.status === 401 || error.status === 403) &&
      isNonceErrorPayload({ message: error.message })
    ) {
      await refreshNonce();
      return requestStoreApi<T>(path, init, true);
    }

    if (error instanceof WooClientError) {
      throw error;
    }

    throw new Error("Temporary connection issue reaching checkout store. Please try again.", {
      cause: error,
    });
  }
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
      accentBg: pickAccentColor(index),
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

async function recoverCartAfterMutationFailure(): Promise<StorefrontCart | null> {
  try {
    return await fetchCart();
  } catch {
    return null;
  }
}

// ── Cart operations ────────────────────────────────────────────────────────

export async function fetchCart(): Promise<StorefrontCart> {
  const raw = await requestStoreApi<RawCart>("/cart");
  const mapped = runSchema(StorefrontCartSchema, mapRawCart(raw), "fetchCart");
  saveCachedCartSnapshot(mapped);
  return mapped;
}

export async function addCartItem(productId: number, quantity = 1): Promise<StorefrontCart> {
  try {
    const raw = await requestStoreApi<RawCart>("/cart/add-item", {
      method: "POST",
      body: JSON.stringify({ id: productId, quantity }),
    });
    const mapped = runSchema(StorefrontCartSchema, mapRawCart(raw), "addCartItem");
    saveCachedCartSnapshot(mapped);
    return mapped;
  } catch (error) {
    const recovered = await recoverCartAfterMutationFailure();
    if (recovered && recovered.items.some((item) => item.productId === productId)) {
      return recovered;
    }
    throw error;
  }
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

  try {
    const raw = await requestStoreApi<RawCart>("/cart/add-item", {
      method: "POST",
      body: JSON.stringify({
        id: productId,
        quantity,
        ...(sanitizedVariation.length > 0 ? { variation: sanitizedVariation } : {}),
      }),
    });
    const mapped = runSchema(StorefrontCartSchema, mapRawCart(raw), "addVariableCartItem");
    saveCachedCartSnapshot(mapped);
    return mapped;
  } catch (error) {
    const recovered = await recoverCartAfterMutationFailure();
    if (recovered && recovered.items.some((item) => item.productId === productId)) {
      return recovered;
    }
    throw error;
  }
}

export async function updateCartItemQuantity(key: string, quantity: number): Promise<StorefrontCart> {
  const targetQuantity = Math.max(1, quantity);

  try {
    const raw = await requestStoreApi<RawCart>("/cart/update-item", {
      method: "POST",
      body: JSON.stringify({ key, quantity: targetQuantity }),
    });
    const mapped = runSchema(StorefrontCartSchema, mapRawCart(raw), "updateCartItemQuantity");
    saveCachedCartSnapshot(mapped);
    return mapped;
  } catch (error) {
    const recovered = await recoverCartAfterMutationFailure();
    const recoveredItem = recovered?.items.find((item) => item.key === key);
    if (recovered && recoveredItem && recoveredItem.quantity === targetQuantity) {
      return recovered;
    }
    throw error;
  }
}

export async function removeCartItem(key: string): Promise<StorefrontCart> {
  try {
    const raw = await requestStoreApi<RawCart>("/cart/remove-item", {
      method: "POST",
      body: JSON.stringify({ key }),
    });
    const mapped = runSchema(StorefrontCartSchema, mapRawCart(raw), "removeCartItem");
    saveCachedCartSnapshot(mapped);
    return mapped;
  } catch (error) {
    const recovered = await recoverCartAfterMutationFailure();
    if (recovered && !recovered.items.some((item) => item.key === key)) {
      return recovered;
    }
    throw error;
  }
}

export async function lookupGuestOrder(orderNumber: string, email: string): Promise<StorefrontOrderLookupResult> {
  return wooFetch(
    "/api/orders/lookup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ orderNumber, email }),
      cache: "no-store",
    },
    {
      context: "POST /api/orders/lookup",
      schema: StorefrontOrderLookupResultSchema,
      onUpstreamError: (payload, response) => {
        throw new WooClientError(
          extractErrorMessage(payload) ?? "Order lookup failed.",
          response.status,
        );
      },
    },
  );
}

export async function fetchProductReviews(productId: number): Promise<StorefrontProductReviewsResponse> {
  return wooFetch(
    `/api/products/reviews?productId=${encodeURIComponent(String(productId))}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
    {
      context: `GET /api/products/reviews?productId=${productId}`,
      schema: StorefrontProductReviewsResponseSchema,
      onUpstreamError: (payload, response) => {
        throw new WooClientError(
          extractErrorMessage(payload) ?? "Unable to load reviews.",
          response.status,
        );
      },
    },
  );
}

export async function submitProductReview(input: {
  productId: number;
  rating: number;
  title: string;
  body: string;
  author?: string;
  email?: string;
}): Promise<{ ok: boolean; pendingModeration?: boolean; message?: string }> {
  const normalizeReviewMessage = (raw: string | undefined, fallback: string): string => {
    const message = decodeEntities(raw ?? "").replace(/\s+/g, " ").trim();
    if (!message) {
      return fallback;
    }

    if (/duplicate comment detected|already said that/i.test(message)) {
      return "You already submitted this review. Please edit the text and try again.";
    }

    return message;
  };

  const payload = await wooFetch(
    "/api/products/reviews",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(input),
    },
    {
      context: "POST /api/products/reviews",
      schema: ReviewSubmitResponseSchema,
      onUpstreamError: (errPayload, response) => {
        throw new WooClientError(
          normalizeReviewMessage(extractErrorMessage(errPayload) ?? undefined, "Unable to submit review."),
          response.status,
        );
      },
    },
  );

  return {
    ok: true,
    pendingModeration: Boolean(payload.pendingModeration),
    message: normalizeReviewMessage(payload.message, "Review submitted successfully."),
  };
}
