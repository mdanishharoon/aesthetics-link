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
  UpdateProfilePayload,
  VerifyEmailPayload,
  WholesalePricesResponse,
} from "@/lib/auth/types";
import type { StorefrontOrderConfirmation } from "@/lib/storefront/types";

type ErrorPayload = {
  message?: string;
  code?: string;
  status?: number;
};

export class AuthApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "AuthApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (!response.ok) {
    throw new AuthApiError(
      payload?.message ?? `Auth request failed (${response.status})`,
      response.status,
      payload?.code,
    );
  }

  return payload as T;
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
  return request<{ ok: true }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function getWholesalePrices(ids: number[]): Promise<WholesalePricesResponse> {
  const normalized = ids
    .filter((value) => Number.isInteger(value) && value > 0)
    .slice(0, 100);
  const query = normalized.length > 0 ? `?ids=${encodeURIComponent(normalized.join(","))}` : "";
  return request<WholesalePricesResponse>(`/api/auth/wholesale-prices${query}`);
}
