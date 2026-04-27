import { z } from "zod";

import { AuthUserSchema } from "@/types/woocommerce/customer";
import { StorefrontOrderConfirmationSchema } from "@/types/woocommerce/order";
import { PriceSourceSchema } from "@/types/woocommerce/product";

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  message: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  emailDeliveryAttempted: z.boolean().optional(),
  session_token: z.string().optional(),
  ok: z.boolean().optional(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const AuthOrderSummarySchema = z.object({
  orderId: z.number().int().nonnegative(),
  orderNumber: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  createdAt: z.string(),
  paymentMethod: z.string(),
  itemCount: z.number().int().nonnegative(),
  total: z.string(),
  hasReceipt: z.boolean(),
  receiptToken: z.string(),
  previewItems: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().nonnegative(),
    }),
  ),
});
export type AuthOrderSummary = z.infer<typeof AuthOrderSummarySchema>;

export const AuthOrdersResponseSchema = z.object({
  orders: z.array(AuthOrderSummarySchema),
  total: z.number().int().nonnegative(),
});
export type AuthOrdersResponse = z.infer<typeof AuthOrdersResponseSchema>;

export const AuthDashboardResponseSchema = z.object({
  user: AuthUserSchema,
  orders: z.array(AuthOrderSummarySchema),
  total: z.number().int().nonnegative(),
  initialOrderDetail: StorefrontOrderConfirmationSchema.nullable().optional(),
});
export type AuthDashboardResponse = z.infer<typeof AuthDashboardResponseSchema>;

export const WholesalePriceEntrySchema = z.object({
  productId: z.number().int().nonnegative(),
  priceLabel: z.string(),
  regularPriceLabel: z.string(),
  hasDiscount: z.boolean(),
  source: PriceSourceSchema,
});
export type WholesalePriceEntry = z.infer<typeof WholesalePriceEntrySchema>;

export const WholesalePricesResponseSchema = z.object({
  isWholesaleViewer: z.boolean(),
  prices: z.record(z.string(), WholesalePriceEntrySchema),
});
export type WholesalePricesResponse = z.infer<typeof WholesalePricesResponseSchema>;
