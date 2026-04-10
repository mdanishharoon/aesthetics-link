import { NextRequest, NextResponse } from "next/server";

const RECEIPT_TOKEN_COOKIE = "al_order_receipt";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const receiptToken = (request.nextUrl.searchParams.get("receipt") ?? "").trim();
  const receiptUrl = new URL("/order-confirmed", request.nextUrl.origin);
  const response = NextResponse.redirect(receiptUrl, 302);

  response.cookies.set(RECEIPT_TOKEN_COOKIE, receiptToken, {
    httpOnly: true,
    maxAge: receiptToken ? 60 * 60 * 12 : 0,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });

  return response;
}
