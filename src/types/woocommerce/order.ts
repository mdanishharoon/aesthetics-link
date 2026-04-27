import { z } from "zod";

export const StorefrontOrderAddressSchema = z.object({
  name: z.string(),
  company: z.string(),
  address1: z.string(),
  address2: z.string(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  country: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  lines: z.array(z.string()),
});
export type StorefrontOrderAddress = z.infer<typeof StorefrontOrderAddressSchema>;

export const StorefrontOrderConfirmationItemSchema = z.object({
  id: z.number().int().nonnegative(),
  variationId: z.number().int().nonnegative(),
  name: z.string(),
  quantity: z.number().int().nonnegative(),
  unitPrice: z.string(),
  lineTotal: z.string(),
  image: z.string(),
  sku: z.string(),
  meta: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    }),
  ),
});
export type StorefrontOrderConfirmationItem = z.infer<
  typeof StorefrontOrderConfirmationItemSchema
>;

export const StorefrontOrderTotalsSchema = z.object({
  subtotal: z.string(),
  shipping: z.string(),
  tax: z.string(),
  total: z.string(),
});
export type StorefrontOrderTotals = z.infer<typeof StorefrontOrderTotalsSchema>;

export const StorefrontOrderConfirmationSchema = z.object({
  orderId: z.number().int().nonnegative(),
  orderNumber: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  createdAt: z.string(),
  paymentMethod: z.string(),
  customerNote: z.string(),
  itemCount: z.number().int().nonnegative(),
  items: z.array(StorefrontOrderConfirmationItemSchema),
  totals: StorefrontOrderTotalsSchema,
  billingAddress: StorefrontOrderAddressSchema,
  shippingAddress: StorefrontOrderAddressSchema,
});
export type StorefrontOrderConfirmation = z.infer<typeof StorefrontOrderConfirmationSchema>;

export const StorefrontOrderLookupResultSchema = z.object({
  order: StorefrontOrderConfirmationSchema.extend({
    hasReceipt: z.boolean(),
    receiptToken: z.string(),
  }),
});
export type StorefrontOrderLookupResult = z.infer<typeof StorefrontOrderLookupResultSchema>;
