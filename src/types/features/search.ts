// Stub schemas for the Phase 4 faceted search feature. Not consumed today.
import { z } from "zod";

export const SortBySchema = z.enum([
  "relevance",
  "price_asc",
  "price_desc",
  "newest",
  "popularity",
  "rating",
]);
export type SortBy = z.infer<typeof SortBySchema>;

export const SearchFiltersSchema = z
  .object({
    keyword: z.string().trim().optional(),
    category: z.string().trim().optional(),
    brand: z.string().trim().optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    attributes: z.record(z.string(), z.array(z.string())).optional(),
    inStock: z.boolean().optional(),
    onSale: z.boolean().optional(),
    sortBy: SortBySchema.optional().default("relevance"),
    page: z.number().int().positive().optional().default(1),
    perPage: z.number().int().positive().max(100).optional().default(24),
  })
  .strict();
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const FacetOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});
export type FacetOption = z.infer<typeof FacetOptionSchema>;

export const FacetGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["category", "brand", "price", "attribute", "boolean"]),
  options: z.array(FacetOptionSchema),
});
export type FacetGroup = z.infer<typeof FacetGroupSchema>;
