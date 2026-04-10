import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

const CART_TOKEN_COOKIE = "woo_cart_token";
const NONCE_TOKEN_COOKIE = "woo_nonce_token";
const ALLOWED_ROOTS = new Set(["products", "cart", "checkout", "order"]);
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);
type RouteContextParams = { params: Promise<{ path?: string[] }> };

function extractNetworkErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const directCode =
    "code" in error && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;

  if (directCode) {
    return directCode;
  }

  const cause =
    "cause" in error && (error as { cause?: unknown }).cause
      ? (error as { cause: unknown }).cause
      : null;

  if (!cause || typeof cause !== "object") {
    return null;
  }

  return "code" in cause && typeof (cause as { code?: unknown }).code === "string"
    ? (cause as { code: string }).code
    : null;
}

function isRetryableNetworkError(error: unknown): boolean {
  const code = extractNetworkErrorCode(error);
  return Boolean(code && RETRYABLE_NETWORK_CODES.has(code));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  input: string,
  init: RequestInit,
  maxAttempts: number,
): Promise<Response> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableNetworkError(error)) {
        throw error;
      }

      await sleep(150 * attempt);
    }
  }

  throw (lastError as Error) ?? new Error("Unknown upstream request error.");
}

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

  let upstreamResponse: Response;
  try {
    const attempts = request.method === "GET" || request.method === "HEAD" ? 2 : 1;
    upstreamResponse = await fetchWithRetry(
      upstreamUrl.toString(),
      {
        method: request.method,
        headers: upstreamHeaders,
        body,
        cache: "no-store",
      },
      attempts,
    );
  } catch (error) {
    const code = extractNetworkErrorCode(error) ?? "UNKNOWN";
    console.error(`[Woo proxy] Upstream request failed (${code})`, error);
    return NextResponse.json(
      { message: "Temporary connection issue reaching checkout store. Please try again." },
      { status: 502 },
    );
  }

  const responseText = await upstreamResponse.text();
  const response = new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "application/json; charset=utf-8",
      "Cache-Control": "no-store",
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
