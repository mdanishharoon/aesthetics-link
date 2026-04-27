import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";
import { parseJsonBody } from "@/lib/api-validate";
import { ReviewSubmitPayloadSchema } from "@/types";

const SESSION_COOKIE = "al_session_token";

function buildAuthHeaders(request: NextRequest): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value?.trim();
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }
  return headers;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const productId = Number(request.nextUrl.searchParams.get("productId") ?? "0");
  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ message: "A valid productId is required." }, { status: 400 });
  }

  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ message: "Review backend is not configured." }, { status: 500 });
  }

  const upstreamUrl = new URL("/wp-json/aesthetics-link/v1/products/reviews", baseUrl);
  upstreamUrl.searchParams.set("productId", String(productId));

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach review service." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
  if (!upstream.ok) {
    const message = payload && typeof payload.message === "string" ? payload.message : "Unable to load reviews.";
    return NextResponse.json({ message }, { status: upstream.status });
  }

  return NextResponse.json(payload ?? { productId, summary: null, reviews: [] }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = await parseJsonBody(request, ReviewSubmitPayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ message: "Review backend is not configured." }, { status: 500 });
  }

  const upstreamUrl = new URL("/wp-json/aesthetics-link/v1/products/reviews", baseUrl);
  let upstream: Response;

  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers: buildAuthHeaders(request),
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach review service." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;
  if (!upstream.ok) {
    const message = payload && typeof payload.message === "string" ? payload.message : "Unable to submit review.";
    return NextResponse.json({ message }, { status: upstream.status });
  }

  return NextResponse.json(payload ?? { ok: true }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
