"use client";

import { z } from "zod";
import type { ZodType } from "zod";

import {
  AuthDashboardResponseSchema,
  AuthOrdersResponseSchema,
  AuthResponseSchema,
  StorefrontOrderConfirmationSchema,
  WholesalePricesResponseSchema,
  type AuthDashboardResponse,
  type AuthOrdersResponse,
  type AuthResponse,
  type LoginPayload,
  type RegisterPayload,
  type RequestEmailVerificationPayload,
  type RequestPasswordResetPayload,
  type ResetPasswordPayload,
  type StorefrontOrderConfirmation,
  type UpdateProfilePayload,
  type VerifyEmailPayload,
  type WholesalePricesResponse,
} from "@/types";
import {
  WooClientError,
  extractErrorMessage,
  extractErrorPayloadCode,
  wooFetch,
} from "@/lib/woo-client";
import { clearCachedCartSnapshot } from "@/lib/storefront/client";

const LogoutResponseSchema = z.object({ ok: z.literal(true) });

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "AuthApiError";
  }
}

async function request<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  try {
    return await wooFetch(
      path,
      {
        cache: "no-store",
        ...init,
        headers: {
          Accept: "application/json",
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
          ...init?.headers,
        },
      },
      {
        context: `${init?.method ?? "GET"} ${path}`,
        schema,
        onUpstreamError: (payload, response) => {
          throw new AuthApiError(
            extractErrorMessage(payload) ?? `Auth request failed (${response.status})`,
            response.status,
            extractErrorPayloadCode(payload) ?? undefined,
          );
        },
      },
    );
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    if (error instanceof WooClientError) {
      throw new AuthApiError(error.message, error.status || 0, error.code);
    }
    throw error;
  }
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return request("/api/auth/login", AuthResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return request("/api/auth/register", AuthResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestEmailVerification(payload: RequestEmailVerificationPayload): Promise<AuthResponse> {
  return request("/api/auth/request-email-verification", AuthResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<AuthResponse> {
  return request("/api/auth/verify-email", AuthResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestPasswordReset(payload: RequestPasswordResetPayload): Promise<AuthResponse> {
  return request("/api/auth/request-password-reset", AuthResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<AuthResponse> {
  return request("/api/auth/reset-password", AuthResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<AuthResponse> {
  return request("/api/auth/me", AuthResponseSchema);
}

export async function getAccountDashboard(limit = 12): Promise<AuthDashboardResponse> {
  const normalized = Number.isFinite(limit) ? Math.max(1, Math.min(24, Math.floor(limit))) : 12;
  return request(`/api/auth/dashboard?limit=${normalized}`, AuthDashboardResponseSchema);
}

export async function getOrders(limit = 12): Promise<AuthOrdersResponse> {
  const normalized = Number.isFinite(limit) ? Math.max(1, Math.min(24, Math.floor(limit))) : 12;
  return request(`/api/auth/orders?limit=${normalized}`, AuthOrdersResponseSchema);
}

export async function getOrderDetail(orderId: number): Promise<StorefrontOrderConfirmation> {
  return request(
    `/api/auth/order?orderId=${encodeURIComponent(String(orderId))}`,
    StorefrontOrderConfirmationSchema,
  );
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthResponse> {
  return request("/api/auth/profile", AuthResponseSchema, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<{ ok: true }> {
  try {
    return await request("/api/auth/logout", LogoutResponseSchema, {
      method: "POST",
    });
  } finally {
    // Clear the local cart snapshot regardless of upstream success so a stale
    // cart never leaks between accounts on the same browser.
    clearCachedCartSnapshot();
  }
}

export async function getWholesalePrices(ids: number[]): Promise<WholesalePricesResponse> {
  const normalized = ids
    .filter((value) => Number.isInteger(value) && value > 0)
    .slice(0, 100);
  const query = normalized.length > 0 ? `?ids=${encodeURIComponent(normalized.join(","))}` : "";
  return request(`/api/auth/wholesale-prices${query}`, WholesalePricesResponseSchema);
}
