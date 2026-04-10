import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const baseUrl = getWooStoreBaseUrl();

  if (!baseUrl) {
    return NextResponse.json({ message: "WOOCOMMERCE_STORE_URL is not configured." }, { status: 500 });
  }

  const body = await request.text();
  const upstreamUrl = new URL("/wp-json/aesthetics-link/v1/orders/lookup", baseUrl);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": request.headers.get("content-type") ?? "application/json",
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach WooCommerce order service." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
  return NextResponse.json(payload ?? {}, { status: upstream.status });
}
