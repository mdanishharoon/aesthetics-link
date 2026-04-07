import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

const CART_TOKEN_COOKIE = "woo_cart_token";
const NONCE_TOKEN_COOKIE = "woo_nonce_token";
const ALLOWED_ROOTS = new Set(["products", "cart", "checkout", "order"]);
type RouteContextParams = { params: Promise<{ path?: string[] }> };

function applySessionCookies(
  response: NextResponse,
  cartToken: string | null,
  nonceToken: string | null,
): void {
  const secure = process.env.NODE_ENV === "production";

  if (cartToken) {
    response.cookies.set({
      name: CART_TOKEN_COOKIE,
      value: cartToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (nonceToken) {
    response.cookies.set({
      name: NONCE_TOKEN_COOKIE,
      value: nonceToken,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }
}

async function proxyWooStoreApi(
  request: NextRequest,
  context: RouteContextParams,
): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const root = path[0];

  if (!root || !ALLOWED_ROOTS.has(root)) {
    return NextResponse.json({ message: "Unsupported Woo Store API endpoint." }, { status: 404 });
  }

  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      {
        message: "WOOCOMMERCE_STORE_URL is not configured.",
      },
      { status: 500 },
    );
  }

  const upstreamUrl = new URL(`/wp-json/wc/store/v1/${path.join("/")}`, baseUrl);
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    upstreamUrl.searchParams.append(key, value);
  }

  const upstreamHeaders = new Headers({
    Accept: "application/json",
  });

  const contentType = request.headers.get("content-type");
  if (contentType) {
    upstreamHeaders.set("Content-Type", contentType);
  }

  const cartToken = request.cookies.get(CART_TOKEN_COOKIE)?.value;
  const nonceToken = request.cookies.get(NONCE_TOKEN_COOKIE)?.value;

  if (cartToken) {
    upstreamHeaders.set("Cart-Token", cartToken);
  }

  if (nonceToken && request.method !== "GET" && request.method !== "HEAD") {
    upstreamHeaders.set("Nonce", nonceToken);
  }

  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: request.method,
    headers: upstreamHeaders,
    body,
    cache: "no-store",
  });

  const responseText = await upstreamResponse.text();
  const response = new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });

  applySessionCookies(
    response,
    upstreamResponse.headers.get("cart-token") ?? upstreamResponse.headers.get("Cart-Token"),
    upstreamResponse.headers.get("nonce") ?? upstreamResponse.headers.get("Nonce"),
  );

  return response;
}

export async function GET(
  request: NextRequest,
  context: RouteContextParams,
): Promise<NextResponse> {
  return proxyWooStoreApi(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContextParams,
): Promise<NextResponse> {
  return proxyWooStoreApi(request, context);
}

export async function PUT(
  request: NextRequest,
  context: RouteContextParams,
): Promise<NextResponse> {
  return proxyWooStoreApi(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContextParams,
): Promise<NextResponse> {
  return proxyWooStoreApi(request, context);
}
