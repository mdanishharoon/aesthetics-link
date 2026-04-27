import { z } from "zod";

export const StorefrontCartItemSchema = z.object({
  key: z.string(),
  productId: z.number().int().nonnegative(),
  slug: z.string(),
  name: z.string(),
  shortName: z.string(),
  quantity: z.number().int().positive(),
  price: z.string(),
  lineTotal: z.string(),
  variations: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
  image: z.string(),
  imageAlt: z.string(),
  accentBg: z.string(),
});
export type StorefrontCartItem = z.infer<typeof StorefrontCartItemSchema>;

export const StorefrontCartSchema = z.object({
  items: z.array(StorefrontCartItemSchema),
  itemCount: z.number().int().nonnegative(),
  subtotal: z.string(),
  shipping: z.string(),
  tax: z.string(),
  total: z.string(),
  currencySymbol: z.string(),
  needsShipping: z.boolean(),
});
export type StorefrontCart = z.infer<typeof StorefrontCartSchema>;

export const StorefrontCheckoutAddressSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  address_1: z.string(),
  address_2: z.string().nullable().optional(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  country: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
});
export type StorefrontCheckoutAddress = z.infer<typeof StorefrontCheckoutAddressSchema>;

export const StorefrontCheckoutPayloadSchema = z.object({
  billing_address: StorefrontCheckoutAddressSchema,
  shipping_address: StorefrontCheckoutAddressSchema,
  customer_note: z.string().optional(),
  payment_method: z.string(),
  payment_data: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .optional(),
  create_account: z.boolean().optional(),
});
export type StorefrontCheckoutPayload = z.infer<typeof StorefrontCheckoutPayloadSchema>;

export const StorefrontCheckoutResponseSchema = z.object({
  status: z.string(),
  redirectUrl: z.string().optional(),
  orderId: z.number().int().nonnegative().optional(),
  raw: z.unknown(),
});
export type StorefrontCheckoutResponse = z.infer<typeof StorefrontCheckoutResponseSchema>;
