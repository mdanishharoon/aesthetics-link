import { NextRequest, NextResponse } from "next/server";

const CART_TOKEN_COOKIE = "woo_cart_token";
const NONCE_TOKEN_COOKIE = "woo_nonce_token";
const RECEIPT_TOKEN_COOKIE = "al_order_receipt";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const receiptToken = (searchParams.get("receipt") ?? "").trim();

  const confirmUrl = new URL("/order-confirmed", request.nextUrl.origin);
  confirmUrl.searchParams.set("just_completed", "1");

  const response = NextResponse.redirect(confirmUrl, 302);
  response.headers.set("Cache-Control", "no-store");

  response.cookies.set(CART_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(NONCE_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(RECEIPT_TOKEN_COOKIE, receiptToken, {
    httpOnly: true,
    maxAge: receiptToken ? 60 * 60 * 12 : 0,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}
