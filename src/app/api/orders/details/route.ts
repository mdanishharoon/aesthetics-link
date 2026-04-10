import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const receiptToken = (request.nextUrl.searchParams.get("receipt") ?? "").trim();
  const baseUrl = getWooStoreBaseUrl();

  if (!baseUrl) {
    return NextResponse.json({ message: "WOOCOMMERCE_STORE_URL is not configured." }, { status: 500 });
  }

  if (!receiptToken) {
    return NextResponse.json({ message: "Receipt token is required." }, { status: 400 });
  }

  const upstreamUrl = new URL("/wp-json/aesthetics-link/v1/orders/confirmation", baseUrl);
  upstreamUrl.searchParams.set("receipt", receiptToken);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach WooCommerce order service." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
  return NextResponse.json(payload ?? {}, { status: upstream.status });
}
