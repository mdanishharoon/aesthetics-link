import { NextRequest, NextResponse } from "next/server";

import { getWooStoreBaseUrl } from "@/lib/storefront/config";
import { parseJsonBody } from "@/lib/api-validate";
import { MarketingTrackPayloadSchema } from "@/types";

const SESSION_COOKIE = "al_session_token";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = await parseJsonBody(request, MarketingTrackPayloadSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const baseUrl = getWooStoreBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ message: "Marketing backend is not configured." }, { status: 500 });
  }

  const upstreamUrl = new URL("/wp-json/aesthetics-link/v1/marketing/track", baseUrl);
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value?.trim();

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Unable to reach marketing service." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => null)) as Record<string, unknown> | null;

  if (!upstream.ok) {
    const message =
      payload && typeof payload.message === "string"
        ? payload.message
        : `Marketing track failed (${upstream.status}).`;
    return NextResponse.json({ message }, { status: upstream.status });
  }

  return NextResponse.json(payload ?? { ok: true }, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
