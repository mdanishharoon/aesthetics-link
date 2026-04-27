"use client";

import type {
  AuthDashboardResponse,
  AuthOrdersResponse,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RequestEmailVerificationPayload,
  RequestPasswordResetPayload,
  ResetPasswordPayload,
  StorefrontOrderConfirmation,
  UpdateProfilePayload,
  VerifyEmailPayload,
  WholesalePricesResponse,
} from "@/types";
import {
  WooClientError,
  extractErrorMessage,
  extractErrorPayloadCode,
  wooFetch,
} from "@/lib/woo-client";
import { clearCachedCartSnapshot } from "@/lib/storefront/client";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await wooFetch<T>(
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
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestEmailVerification(payload: RequestEmailVerificationPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/request-email-verification", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function requestPasswordReset(payload: RequestPasswordResetPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/me");
}

export async function getAccountDashboard(limit = 12): Promise<AuthDashboardResponse> {
  const normalized = Number.isFinite(limit) ? Math.max(1, Math.min(24, Math.floor(limit))) : 12;
  return request<AuthDashboardResponse>(`/api/auth/dashboard?limit=${normalized}`);
}

export async function getOrders(limit = 12): Promise<AuthOrdersResponse> {
  const normalized = Number.isFinite(limit) ? Math.max(1, Math.min(24, Math.floor(limit))) : 12;
  return request<AuthOrdersResponse>(`/api/auth/orders?limit=${normalized}`);
}

export async function getOrderDetail(orderId: number): Promise<StorefrontOrderConfirmation> {
  return request<StorefrontOrderConfirmation>(`/api/auth/order?orderId=${encodeURIComponent(String(orderId))}`);
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<{ ok: true }> {
  try {
    return await request<{ ok: true }>("/api/auth/logout", {
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
  return request<WholesalePricesResponse>(`/api/auth/wholesale-prices${query}`);
}
