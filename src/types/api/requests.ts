import { z } from "zod";

import {
  AccountTypeSchema,
  AuthAddressSchema,
  BusinessInfoSchema,
} from "@/types/woocommerce/customer";

const TrimmedString = z.string().trim();
const NonEmptyTrimmed = TrimmedString.min(1);
const EmailField = z.email().toLowerCase();
const CaptchaField = z.string().trim().optional();
const PasswordField = z.string().min(8);

/* -------------------------------------------------------------------------- */
/*  /api/auth/*                                                                */
/* -------------------------------------------------------------------------- */

export const LoginPayloadSchema = z
  .object({
    email: EmailField,
    password: z.string().min(1),
    captchaToken: CaptchaField,
  })
  .strict();
export type LoginPayload = z.infer<typeof LoginPayloadSchema>;

export const RegisterPayloadSchema = z
  .object({
    firstName: NonEmptyTrimmed,
    lastName: NonEmptyTrimmed,
    email: EmailField,
    password: PasswordField,
    accountType: AccountTypeSchema,
    marketingOptIn: z.boolean().optional(),
    businessInfo: BusinessInfoSchema.optional(),
    captchaToken: CaptchaField,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.accountType === "clinic") {
      const info = value.businessInfo;
      const hasClinicName = info?.clinicName?.trim() ?? "";
      if (!hasClinicName) {
        ctx.addIssue({
          code: "custom",
          path: ["businessInfo", "clinicName"],
          message: "Clinic accounts require a clinic name.",
        });
      }
    }
  });
export type RegisterPayload = z.infer<typeof RegisterPayloadSchema>;

export const RequestEmailVerificationPayloadSchema = z
  .object({
    email: EmailField,
    captchaToken: CaptchaField,
  })
  .strict();
export type RequestEmailVerificationPayload = z.infer<
  typeof RequestEmailVerificationPayloadSchema
>;

export const VerifyEmailPayloadSchema = z
  .object({
    token: NonEmptyTrimmed,
  })
  .strict();
export type VerifyEmailPayload = z.infer<typeof VerifyEmailPayloadSchema>;

export const RequestPasswordResetPayloadSchema = z
  .object({
    email: EmailField,
    captchaToken: CaptchaField,
  })
  .strict();
export type RequestPasswordResetPayload = z.infer<
  typeof RequestPasswordResetPayloadSchema
>;

export const ResetPasswordPayloadSchema = z
  .object({
    token: NonEmptyTrimmed,
    password: PasswordField,
    captchaToken: CaptchaField,
  })
  .strict();
export type ResetPasswordPayload = z.infer<typeof ResetPasswordPayloadSchema>;

export const UpdateProfilePayloadSchema = z
  .object({
    firstName: TrimmedString,
    lastName: TrimmedString,
    displayName: TrimmedString,
    billingAddress: AuthAddressSchema,
    shippingAddress: AuthAddressSchema,
    businessInfo: BusinessInfoSchema.optional(),
  })
  .strict();
export type UpdateProfilePayload = z.infer<typeof UpdateProfilePayloadSchema>;

/* -------------------------------------------------------------------------- */
/*  /api/orders/*                                                              */
/* -------------------------------------------------------------------------- */

export const OrderLookupPayloadSchema = z
  .object({
    orderId: z.union([z.string().trim().min(1), z.number().int().positive()]),
    email: EmailField,
  })
  .strict();
export type OrderLookupPayload = z.infer<typeof OrderLookupPayloadSchema>;

/* -------------------------------------------------------------------------- */
/*  /api/products/reviews                                                      */
/* -------------------------------------------------------------------------- */

export const ReviewSubmitPayloadSchema = z
  .object({
    productId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
    title: NonEmptyTrimmed.max(150),
    body: NonEmptyTrimmed.max(5000),
    author: TrimmedString.max(150).optional().default(""),
    email: z.union([z.literal(""), EmailField]).optional().default(""),
  })
  .strict();
export type ReviewSubmitPayload = z.infer<typeof ReviewSubmitPayloadSchema>;
