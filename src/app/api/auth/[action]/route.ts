import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

const SESSION_COOKIE = "al_session_token";
const WOO_CART_TOKEN_COOKIE = "woo_cart_token";
const WOO_NONCE_TOKEN_COOKIE = "woo_nonce_token";
const AUTH_ENDPOINT_PREFIX = "/wp-json/aesthetics-link/v1/auth";

type Action =
  | "login"
  | "register"
  | "me"
  | "order"
  | "logout"
  | "orders"
  | "profile"
  | "request-email-verification"
  | "verify-email"
  | "request-password-reset"
  | "reset-password"
  | "wholesale-prices";
type RouteContextParams = { params: Promise<{ action?: string }> };

function isAction(value: string | undefined): value is Action {
  return (
    value === "login" ||
    value === "register" ||
    value === "me" ||
    value === "order" ||
    value === "logout" ||
    value === "orders" ||
    value === "profile" ||
    value === "request-email-verification" ||
    value === "verify-email" ||
    value === "request-password-reset" ||
    value === "reset-password" ||
    value === "wholesale-prices"
  );
}

function isMethodAllowed(action: Action, method: string): boolean {
  if (action === "me" || action === "order" || action === "orders" || action === "wholesale-prices") {
    return method === "GET";
  }

  return method === "POST";
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

async function handler(req: NextRequest, context: RouteContextParams): Promise<NextResponse> {
  const { action: maybeAction } = await context.params;

  if (!isAction(maybeAction)) {
    return NextResponse.json({ message: "Unsupported auth action." }, { status: 404 });
  }

  if (!isMethodAllowed(maybeAction, req.method)) {
    return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
  }

  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ message: "WOOCOMMERCE_STORE_URL is not configured." }, { status: 500 });
  }

  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;

  if (maybeAction === "logout" && !sessionToken) {
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(WOO_CART_TOKEN_COOKIE);
    response.cookies.delete(WOO_NONCE_TOKEN_COOKIE);
    return response;
  }

  if ((maybeAction === "me" || maybeAction === "order" || maybeAction === "orders" || maybeAction === "profile" || maybeAction === "wholesale-prices") && !sessionToken) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const upstreamUrl = new URL(`${AUTH_ENDPOINT_PREFIX}/${maybeAction}`, baseUrl);
  if (req.nextUrl.search) {
    upstreamUrl.search = req.nextUrl.search;
  }

  const headers = new Headers({
    Accept: "application/json",
  });

  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }

  const body = req.method === "GET" ? undefined : await req.text();
  if (body) {
    headers.set("Content-Type", req.headers.get("content-type") ?? "application/json");
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        code: "upstream_unreachable",
        message: "Unable to reach WooCommerce auth service.",
      },
      { status: 502 },
    );
  }

  const upstreamText = await upstream.text();
  let upstreamPayload: Record<string, unknown> = {};

  if (upstreamText) {
    try {
      upstreamPayload = JSON.parse(upstreamText) as Record<string, unknown>;
    } catch {
      upstreamPayload = { message: upstreamText };
    }
  }

  const response = NextResponse.json(upstreamPayload, { status: upstream.status });

  const clearWooCartSession = (): void => {
    response.cookies.delete(WOO_CART_TOKEN_COOKIE);
    response.cookies.delete(WOO_NONCE_TOKEN_COOKIE);
  };

  if ((maybeAction === "login" || maybeAction === "register" || maybeAction === "verify-email") && upstream.ok) {
    const token = upstreamPayload.session_token;
    if (typeof token === "string" && token.length > 20) {
      response.cookies.set({
        name: SESSION_COOKIE,
        value: token,
        ...cookieOptions(),
      });
    }

    if (maybeAction === "login" || maybeAction === "verify-email") {
      // Prevent cart/session leakage when switching accounts in the same browser.
      clearWooCartSession();
    }
  }

  if (maybeAction === "logout" && upstream.ok) {
    response.cookies.delete(SESSION_COOKIE);
    clearWooCartSession();
  }

  if (maybeAction === "me" && upstream.status === 401) {
    response.cookies.delete(SESSION_COOKIE);
  }

  return response;
}

export async function GET(req: NextRequest, context: RouteContextParams): Promise<NextResponse> {
  return handler(req, context);
}

export async function POST(req: NextRequest, context: RouteContextParams): Promise<NextResponse> {
  return handler(req, context);
}
