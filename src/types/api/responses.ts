import { z } from "zod";

export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  status: z.number().int().optional(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Generic envelope for API responses produced by Next.js routes. Use the
 * factory `apiResponseSchema(dataSchema)` to build a concrete schema bound to
 * a specific payload shape.
 */
export function apiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().nullable().optional(),
    meta: PaginationMetaSchema.optional(),
  });
}

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string | null;
  meta?: PaginationMeta;
};

export type PaginatedResponse<T> = ApiResponse<T[]> & { meta: PaginationMeta };

/** Error returned by the WooCommerce upstream surface (proxied through `/api/woo/*`). */
export const WooApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  data: z
    .object({
      status: z.number().int().optional(),
      details: z.unknown().optional(),
    })
    .optional(),
});
export type WooApiError = z.infer<typeof WooApiErrorSchema>;
