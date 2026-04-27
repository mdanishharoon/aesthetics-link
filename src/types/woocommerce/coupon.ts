// Stub schemas for Phase 4 coupon support. Not currently consumed by any code.
// Shape mirrors WooCommerce's coupon resource and the planned validate/apply
// endpoints described in the Phase 3/4 plan.
import { z } from "zod";

export const CouponDiscountSchema = z.object({
  code: z.string(),
  type: z.enum(["percent", "fixed_cart", "fixed_product"]),
  amount: z.string(),
  appliesTo: z.array(z.number().int().nonnegative()).optional(),
  minSpend: z.string().nullable().optional(),
  maxSpend: z.string().nullable().optional(),
});
export type CouponDiscount = z.infer<typeof CouponDiscountSchema>;

export const CouponSchema = z.object({
  code: z.string(),
  description: z.string().optional(),
  discount: CouponDiscountSchema,
  expiresAt: z.string().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  usageCount: z.number().int().nonnegative().optional(),
});
export type Coupon = z.infer<typeof CouponSchema>;

export const CouponValidationResultSchema = z.object({
  valid: z.boolean(),
  reason: z
    .enum([
      "ok",
      "expired",
      "min_spend_not_met",
      "max_spend_exceeded",
      "usage_limit_reached",
      "ineligible_items",
      "already_applied",
      "not_found",
    ])
    .optional(),
  message: z.string().optional(),
  coupon: CouponSchema.nullable().optional(),
});
export type CouponValidationResult = z.infer<typeof CouponValidationResultSchema>;
