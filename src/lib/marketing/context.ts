import type { AuthUser } from "@/types";

export type MarketingCustomerType = "retail" | "clinic" | "wholesale" | "guest";

function parseLocaleRegion(locale: string | null | undefined): string {
  if (!locale || typeof locale !== "string") {
    return "";
  }

  const match = locale.trim().match(/[-_]([A-Za-z]{2})\b/);
  const region = match?.[1];
  return region ? region.toUpperCase() : "";
}

function normalizeRegion(value: string | null | undefined): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  const localeRegion = parseLocaleRegion(normalized);
  return localeRegion || "";
}

export function resolveMarketingCustomerType(user: AuthUser | null | undefined): MarketingCustomerType {
  if (!user) {
    return "guest";
  }

  if (user.role === "wholesale_customer" || user.wholesaleApproved) {
    return "wholesale";
  }

  if (user.accountType === "clinic") {
    return "clinic";
  }

  return "retail";
}

export function resolveMarketingRegion(
  user: AuthUser | null | undefined,
  localeFallback: string | null | undefined,
): string {
  const fromBilling = normalizeRegion(user?.billingAddress?.country);
  if (fromBilling) {
    return fromBilling;
  }

  const fromShipping = normalizeRegion(user?.shippingAddress?.country);
  if (fromShipping) {
    return fromShipping;
  }

  return parseLocaleRegion(localeFallback);
}

