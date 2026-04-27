import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

const CART_TOKEN_COOKIE = "woo_cart_token";
const SESSION_COOKIE = "al_session_token";
const AUTH_ME_ENDPOINT = "/wp-json/aesthetics-link/v1/auth/me";

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function redirectToFrontendCartWithError(request: NextRequest, errorCode: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/cart";
  url.search = "";
  url.searchParams.set("checkout_error", errorCode);
  return NextResponse.redirect(url, 307);
}

async function getBridgeUserId(
  baseUrl: string,
  sessionToken: string | undefined,
): Promise<{ ok: boolean; userId: number | null; clearSession: boolean }> {
  const token = sessionToken?.trim();

  if (!token) {
    return { ok: true, userId: null, clearSession: false };
  }

  try {
    const response = await fetch(new URL(AUTH_ME_ENDPOINT, baseUrl).toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { ok: true, userId: null, clearSession: true };
      }

      console.error("[Checkout bridge] Failed to resolve bridge user context.", {
        status: response.status,
      });
      return { ok: false, userId: null, clearSession: false };
    }

    const payload = (await response.json().catch(() => null)) as
      | { user?: { id?: number | string } }
      | null;
    const rawId = payload?.user?.id;
    const userId =
      typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : NaN;

    if (!Number.isInteger(userId) || userId <= 0) {
      console.error("[Checkout bridge] Auth /me response did not include a valid user id.");
      return { ok: false, userId: null, clearSession: false };
    }

    return { ok: true, userId, clearSession: false };
  } catch (error) {
    console.error("[Checkout bridge] Failed to fetch bridge user context.", error);
    return { ok: false, userId: null, clearSession: false };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const baseUrl = getWooStoreBaseUrl();

  if (!baseUrl) {
    return NextResponse.json({ message: "WOOCOMMERCE_STORE_URL is not configured." }, { status: 500 });
  }

  const cartToken = request.cookies.get(CART_TOKEN_COOKIE)?.value?.trim();
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  const secret =
    process.env.WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET?.trim() ||
    process.env.AL_B2B_CHECKOUT_BRIDGE_SECRET?.trim();

  if (!cartToken) {
    return redirectToFrontendCartWithError(request, "missing_cart_token");
  }

  if (!secret) {
    console.error("[Checkout bridge] Missing WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET.");
    return redirectToFrontendCartWithError(request, "bridge_unavailable");
  }

  const bridgeUser = await getBridgeUserId(baseUrl, sessionToken);
  if (!bridgeUser.ok) {
    return redirectToFrontendCartWithError(request, "bridge_identity_unavailable");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      cartToken,
      ...(bridgeUser.userId ? { userId: bridgeUser.userId } : {}),
      iat: now,
      exp: now + 5 * 60,
    }),
    "utf8",
  ).toString("base64url");

  const signature = signPayload(payload, secret);
  const bridgeUrl = new URL("/wp-json/aesthetics-link/v1/checkout/bridge", baseUrl);
  bridgeUrl.searchParams.set("al_b2b_checkout_bridge", payload);
  bridgeUrl.searchParams.set("sig", signature);
  const response = NextResponse.redirect(bridgeUrl.toString(), 307);

  if (bridgeUser.clearSession) {
    response.cookies.delete(SESSION_COOKIE);
  }

  return response;
}
