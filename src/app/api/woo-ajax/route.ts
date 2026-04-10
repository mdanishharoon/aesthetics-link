import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

const ALLOWED_ACTIONS = new Set(["get_variation"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ message: "Store not configured." }, { status: 500 });
  }

  const body = await request.text();
  const action = new URLSearchParams(body).get("action");

  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ message: "Unsupported action." }, { status: 400 });
  }

  const upstreamUrl = new URL(`/?wc-ajax=${action}`, baseUrl);

  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const text = await upstreamResponse.text();
  return new NextResponse(text, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
