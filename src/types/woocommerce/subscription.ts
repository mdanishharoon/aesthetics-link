// Stub schemas for future WooCommerce Subscriptions integration. Not consumed
// by any code today; shapes are intentionally minimal until the plugin's
// subscriptions module is implemented in a later phase.
import { z } from "zod";

export const SubscriptionStatusSchema = z.enum([
  "active",
  "on-hold",
  "cancelled",
  "expired",
  "pending-cancel",
  "pending",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionSchema = z.object({
  id: z.number().int().nonnegative(),
  status: SubscriptionStatusSchema,
  customerId: z.number().int().nonnegative(),
  productId: z.number().int().nonnegative(),
  variationId: z.number().int().nonnegative().nullable().optional(),
  total: z.string(),
  currency: z.string(),
  billingPeriod: z.enum(["day", "week", "month", "year"]),
  billingInterval: z.number().int().positive(),
  startDate: z.string(),
  nextPaymentDate: z.string().nullable(),
  endDate: z.string().nullable(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;
