import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

const CART_TOKEN_COOKIE = "woo_cart_token";

function getCheckoutDestination(baseUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).toString();
    } catch {
      // Ignore invalid explicit checkout URL and derive from base URL.
    }
  }

  return new URL("/checkout", baseUrl).toString();
}

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const baseUrl = getWooStoreBaseUrl();

  if (!baseUrl) {
    return NextResponse.json({ message: "WOOCOMMERCE_STORE_URL is not configured." }, { status: 500 });
  }

  const checkoutUrl = getCheckoutDestination(baseUrl);
  const cartToken = request.cookies.get(CART_TOKEN_COOKIE)?.value?.trim();
  const secret =
    process.env.WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET?.trim() ||
    process.env.AL_B2B_CHECKOUT_BRIDGE_SECRET?.trim();

  if (!cartToken) {
    return NextResponse.redirect(checkoutUrl, 307);
  }

  if (!secret) {
    console.error("[Checkout bridge] Missing WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET.");
    return redirectToFrontendCartWithError(request, "bridge_unavailable");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      cartToken,
      iat: now,
      exp: now + 5 * 60,
    }),
    "utf8",
  ).toString("base64url");

  const signature = signPayload(payload, secret);
  const bridgeUrl = new URL(checkoutUrl);
  bridgeUrl.searchParams.set("al_b2b_checkout_bridge", payload);
  bridgeUrl.searchParams.set("sig", signature);

  return NextResponse.redirect(bridgeUrl.toString(), 307);
}
