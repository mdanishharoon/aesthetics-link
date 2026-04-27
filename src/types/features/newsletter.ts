import { z } from "zod";

import {
  MarketingCustomerTypeSchema,
  MarketingRegionSchema,
} from "@/types/features/marketing";

export const NewsletterStatusSchema = z.enum([
  "subscribed",
  "unsubscribed",
  "bounced",
  "complained",
  "invalid",
  "pending",
  "engaged_open",
  "engaged_click",
]);
export type NewsletterStatus = z.infer<typeof NewsletterStatusSchema>;

export const NewsletterSignupPayloadSchema = z
  .object({
    email: z.email(),
    source: z.string().trim().max(64).optional().default("footer"),
    customerType: MarketingCustomerTypeSchema.optional(),
    region: MarketingRegionSchema.optional(),
  })
  .strict();
export type NewsletterSignupPayload = z.infer<typeof NewsletterSignupPayloadSchema>;

/** Shape returned by the plugin's newsletter endpoints / admin views. */
export const NewsletterSubscriberSchema = z.object({
  email: z.email(),
  status: NewsletterStatusSchema,
  source: z.string().nullable().optional(),
  customerType: MarketingCustomerTypeSchema.nullable().optional(),
  region: z.string().nullable().optional(),
  subscribedAt: z.string().nullable().optional(),
  lastEventAt: z.string().nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});
export type NewsletterSubscriber = z.infer<typeof NewsletterSubscriberSchema>;
