import { z } from "zod";

export const MarketingCustomerTypeSchema = z.enum([
  "guest",
  "retail",
  "wholesale",
  "clinic",
]);
export type MarketingCustomerType = z.infer<typeof MarketingCustomerTypeSchema>;

/** Region code is open-ended; the plugin normalizes to short uppercase tokens. */
export const MarketingRegionSchema = z
  .string()
  .trim()
  .max(16);
export type MarketingRegion = z.infer<typeof MarketingRegionSchema>;

export const MarketingTrackPayloadSchema = z
  .object({
    event: z.string().trim().min(1).max(64),
    email: z.union([z.literal(""), z.email()]).optional().default(""),
    source: z.string().trim().max(64).optional().default(""),
    customerType: MarketingCustomerTypeSchema.optional(),
    region: MarketingRegionSchema.optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type MarketingTrackPayload = z.infer<typeof MarketingTrackPayloadSchema>;
