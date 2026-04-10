import type { Product } from "@/data/products";

export type StorefrontCatalogProduct = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  category: string;
  categorySlug: string;
  categorySlugs: string[];
  brand?: string | null;
  brandSlug?: string | null;
  brandSlugs?: string[];
  tagline: string;
  description: string;
  price: string;
  retailPrice?: string;
  regularPrice?: string | null;
  priceSource?: "retail" | "wholesale";
  hasDiscount?: boolean;
  productType?: string;
  hasOptions?: boolean;
  inStock?: boolean;
  stockStatus?: string;
  stockMessage?: string | null;
  image: string;
  imageAlt: string;
  accentBg: string;
};

export type StorefrontNavLink = {
  label: string;
  href: string;
};

export type StorefrontNavigation = {
  top: StorefrontNavLink[];
  concerns: StorefrontNavLink[];
  brands: StorefrontNavLink[];
};

export type StorefrontCartItem = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  shortName: string;
  quantity: number;
  price: string;
  lineTotal: string;
  variations: Array<{
    label: string;
    value: string;
  }>;
  image: string;
  imageAlt: string;
  accentBg: string;
};

export type StorefrontCart = {
  items: StorefrontCartItem[];
  itemCount: number;
  subtotal: string;
  shipping: string;
  tax: string;
  total: string;
  currencySymbol: string;
  needsShipping: boolean;
};

export type StorefrontCheckoutAddress = {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone?: string;
};

export type StorefrontCheckoutPayload = {
  billing_address: StorefrontCheckoutAddress;
  shipping_address: StorefrontCheckoutAddress;
  customer_note?: string;
  payment_method: string;
  payment_data?: Array<{ key: string; value: string }>;
  create_account?: boolean;
};

export type StorefrontCheckoutResponse = {
  status: string;
  redirectUrl?: string;
  orderId?: number;
  raw: unknown;
};

export type StorefrontOrderAddress = {
  name: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
  lines: string[];
};

export type StorefrontOrderConfirmationItem = {
  id: number;
  variationId: number;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  image: string;
  sku: string;
  meta: Array<{
    label: string;
    value: string;
  }>;
};

export type StorefrontOrderConfirmation = {
  orderId: number;
  orderNumber: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  paymentMethod: string;
  customerNote: string;
  itemCount: number;
  items: StorefrontOrderConfirmationItem[];
  totals: {
    subtotal: string;
    shipping: string;
    tax: string;
    total: string;
  };
  billingAddress: StorefrontOrderAddress;
  shippingAddress: StorefrontOrderAddress;
};

export type StorefrontDetailProduct = Product & {
  regularPrice?: string | null;
  priceSource?: "retail" | "wholesale";
  hasDiscount?: boolean;
  productType?: string;
  hasOptions?: boolean;
  variableConfig?: StorefrontVariableConfig | null;
  inStock?: boolean;
  stockStatus?: string;
  stockMessage?: string | null;
};

export type StorefrontVariationAttributeOption = {
  label: string;
  value: string;
};

export type StorefrontVariationAttribute = {
  id: string;
  label: string;
  apiName: string;
  options: StorefrontVariationAttributeOption[];
};

export type StorefrontVariableConfig = {
  isVariable: boolean;
  attributes: StorefrontVariationAttribute[];
  defaults: Record<string, string>;
  variations: Array<{
    id?: number;
    attributes: Record<string, string>;
    price: string | null;
    regularPrice: string | null;
    inStock: boolean | null;
    stockStatus: string | null;
  }>;
};
