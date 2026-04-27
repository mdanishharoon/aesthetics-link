// Stub schemas for the Phase 4 wishlist feature. Not consumed today.
import { z } from "zod";

export const WishlistItemSchema = z.object({
  productId: z.number().int().positive(),
  variationId: z.number().int().positive().nullable().optional(),
  addedAt: z.string(),
});
export type WishlistItem = z.infer<typeof WishlistItemSchema>;

export const WishlistStateSchema = z.object({
  items: z.array(WishlistItemSchema),
  total: z.number().int().nonnegative(),
  syncedAt: z.string().nullable().optional(),
});
export type WishlistState = z.infer<typeof WishlistStateSchema>;

export const WishlistAddPayloadSchema = z
  .object({
    productId: z.number().int().positive(),
    variationId: z.number().int().positive().optional(),
  })
  .strict();
export type WishlistAddPayload = z.infer<typeof WishlistAddPayloadSchema>;

export const WishlistRemovePayloadSchema = z
  .object({
    productId: z.number().int().positive(),
    variationId: z.number().int().positive().optional(),
  })
  .strict();
export type WishlistRemovePayload = z.infer<typeof WishlistRemovePayloadSchema>;
