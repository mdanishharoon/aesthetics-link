import type { Product } from "@/data/products";

export type StorefrontCatalogProduct = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  category: string;
  tagline: string;
  description: string;
  price: string;
  image: string;
  imageAlt: string;
  accentBg: string;
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

export type StorefrontDetailProduct = Product;
