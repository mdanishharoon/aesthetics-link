import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function isAuthorized(req: NextRequest, body: string): boolean {
  const staticToken = process.env.REVALIDATE_SECRET?.trim();
  const providedToken =
    req.headers.get("x-revalidate-token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (staticToken && providedToken && secureCompare(staticToken, providedToken.trim())) {
    return true;
  }

  const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET?.trim();
  const signature = req.headers.get("x-wc-webhook-signature")?.trim();

  if (!webhookSecret || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", webhookSecret).update(body, "utf8").digest("base64");
  return secureCompare(digest, signature);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  if (!isAuthorized(req, body)) {
    return NextResponse.json({ ok: false, message: "Unauthorized revalidation request." }, { status: 401 });
  }

  revalidateTag("woo:products", { expire: 0 });

  try {
    const payload = JSON.parse(body) as { id?: number; slug?: string };
    if (payload.slug) {
      revalidateTag(`woo:product:${payload.slug}`, { expire: 0 });
    }
  } catch {
    // If the body isn't JSON, we still invalidated the product collection tag above.
  }

  return NextResponse.json({
    ok: true,
    revalidatedAt: new Date().toISOString(),
  });
}
