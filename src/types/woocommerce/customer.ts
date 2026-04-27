import { z } from "zod";

export const AccountTypeSchema = z.enum(["retail", "clinic"]);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const ClinicStatusSchema = z
  .enum(["approved", "pending", "rejected"])
  .nullable();
export type ClinicStatus = z.infer<typeof ClinicStatusSchema>;

export const BusinessInfoSchema = z.object({
  clinicName: z.string().optional(),
  businessName: z.string().optional(),
  licenseNumber: z.string().optional(),
  taxId: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
});
export type BusinessInfo = z.infer<typeof BusinessInfoSchema>;

export const AuthAddressSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  name: z.string(),
  company: z.string(),
  phone: z.string(),
  email: z.string(),
  address1: z.string(),
  address2: z.string(),
  city: z.string(),
  state: z.string(),
  postcode: z.string(),
  country: z.string(),
  lines: z.array(z.string()),
});
export type AuthAddress = z.infer<typeof AuthAddressSchema>;

export const AuthUserSchema = z.object({
  id: z.number().int().nonnegative(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  role: z.string(),
  accountType: AccountTypeSchema,
  clinicStatus: ClinicStatusSchema,
  businessInfo: BusinessInfoSchema,
  billingAddress: AuthAddressSchema,
  shippingAddress: AuthAddressSchema,
  emailVerified: z.boolean().optional(),
  wholesaleApproved: z.boolean().optional(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;
