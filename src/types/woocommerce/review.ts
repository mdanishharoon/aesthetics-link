import { z } from "zod";

export const StorefrontProductReviewSchema = z.object({
  id: z.string(),
  author: z.string(),
  rating: z.number().min(0).max(5),
  date: z.string(),
  title: z.string(),
  body: z.string(),
  verified: z.boolean(),
});
export type StorefrontProductReview = z.infer<typeof StorefrontProductReviewSchema>;

export const StorefrontProductReviewsSummarySchema = z.object({
  average: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
  distribution: z.tuple([
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
  ]),
});
export type StorefrontProductReviewsSummary = z.infer<
  typeof StorefrontProductReviewsSummarySchema
>;

export const StorefrontProductReviewsResponseSchema = z.object({
  productId: z.number().int().nonnegative(),
  summary: StorefrontProductReviewsSummarySchema.nullable(),
  reviews: z.array(StorefrontProductReviewSchema),
});
export type StorefrontProductReviewsResponse = z.infer<
  typeof StorefrontProductReviewsResponseSchema
>;
