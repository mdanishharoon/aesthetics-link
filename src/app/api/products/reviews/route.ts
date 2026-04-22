import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";

const SESSION_COOKIE = "al_session_token";

type ReviewSubmitPayload = {
  productId?: number;
  rating?: number;
  title?: string;
  body?: string;
  author?: string;
  email?: string;
};

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
  const body = (await request.json().catch(() => null)) as ReviewSubmitPayload | null;
  const productId = Number(body?.productId ?? 0);
  const rating = Number(body?.rating ?? 0);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const reviewBody = typeof body?.body === "string" ? body.body.trim() : "";
  const author = typeof body?.author === "string" ? body.author.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ message: "A valid productId is required." }, { status: 400 });
  }
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ message: "A valid rating (1-5) is required." }, { status: 400 });
  }
  if (!title || !reviewBody) {
    return NextResponse.json({ message: "Review title and content are required." }, { status: 400 });
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
      body: JSON.stringify({
        productId,
        rating,
        title,
        body: reviewBody,
        author,
        email,
      }),
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

