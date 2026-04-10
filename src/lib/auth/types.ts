import type { StorefrontOrderConfirmation } from "@/lib/storefront/types";

export type AccountType = "retail" | "clinic";

export type ClinicStatus = "approved" | "pending" | "rejected" | null;

export type BusinessInfo = {
  clinicName?: string;
  businessName?: string;
  licenseNumber?: string;
  taxId?: string;
  website?: string;
  phone?: string;
};

export type AuthAddress = {
  firstName: string;
  lastName: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  lines: string[];
};

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  accountType: AccountType;
  clinicStatus: ClinicStatus;
  businessInfo: BusinessInfo;
  billingAddress: AuthAddress;
  shippingAddress: AuthAddress;
  emailVerified?: boolean;
  wholesaleApproved?: boolean;
};

export type AuthResponse = {
  user: AuthUser;
  message?: string;
  requiresApproval?: boolean;
  requiresEmailVerification?: boolean;
  emailDeliveryAttempted?: boolean;
  session_token?: string;
  ok?: boolean;
};

export type LoginPayload = {
  email: string;
  password: string;
  captchaToken?: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  accountType: AccountType;
  businessInfo?: BusinessInfo;
  captchaToken?: string;
};

export type RequestEmailVerificationPayload = {
  email: string;
  captchaToken?: string;
};

export type VerifyEmailPayload = {
  token: string;
};

export type RequestPasswordResetPayload = {
  email: string;
  captchaToken?: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
  captchaToken?: string;
};

export type WholesalePriceEntry = {
  productId: number;
  priceLabel: string;
  regularPriceLabel: string;
  hasDiscount: boolean;
  source: "retail" | "wholesale";
};

export type WholesalePricesResponse = {
  isWholesaleViewer: boolean;
  prices: Record<string, WholesalePriceEntry>;
};

export type AuthOrderSummary = {
  orderId: number;
  orderNumber: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  paymentMethod: string;
  itemCount: number;
  total: string;
  hasReceipt: boolean;
  receiptToken: string;
  previewItems: Array<{
    name: string;
    quantity: number;
  }>;
};

export type AuthOrdersResponse = {
  orders: AuthOrderSummary[];
  total: number;
};

export type AuthDashboardResponse = {
  user: AuthUser;
  orders: AuthOrderSummary[];
  total: number;
  initialOrderDetail?: StorefrontOrderConfirmation | null;
};

export type UpdateProfilePayload = {
  firstName: string;
  lastName: string;
  displayName: string;
  billingAddress: AuthAddress;
  shippingAddress: AuthAddress;
  businessInfo?: BusinessInfo;
};
