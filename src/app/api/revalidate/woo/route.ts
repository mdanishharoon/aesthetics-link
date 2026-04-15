import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

function secureCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

type AuthResult =
  | { ok: true }
  | { ok: false; reason: "no_signature_header" | "no_webhook_secret" | "signature_mismatch" | "no_token" };

function checkAuthorization(req: NextRequest, body: string): AuthResult {
  const staticToken = process.env.REVALIDATE_SECRET?.trim();
  const providedToken =
    req.headers.get("x-revalidate-token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (staticToken && providedToken && secureCompare(staticToken, providedToken.trim())) {
    return { ok: true };
  }

  const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET?.trim();
  const signature = req.headers.get("x-wc-webhook-signature")?.trim();

  if (!webhookSecret) {
    return { ok: false, reason: "no_webhook_secret" };
  }

  if (!signature) {
    return { ok: false, reason: "no_signature_header" };
  }

  const digest = crypto.createHmac("sha256", webhookSecret).update(body, "utf8").digest("base64");
  if (!secureCompare(digest, signature)) {
    return { ok: false, reason: "signature_mismatch" };
  }

  return { ok: true };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  const auth = checkAuthorization(req, body);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized revalidation request.", reason: auth.reason },
      { status: 401 },
    );
  }

  revalidateTag("woo:products", { expire: 0 });
  revalidateTag("woo:categories", { expire: 0 });
  revalidateTag("woo:brands", { expire: 0 });
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");

  let slug: string | null = null;
  try {
    const payload = JSON.parse(body) as { id?: number; slug?: string };
    if (payload.slug) {
      slug = payload.slug;
      revalidateTag(`woo:product:${payload.slug}`, { expire: 0 });
      revalidatePath(`/products/${payload.slug}`);
    }
  } catch {
    // If the body isn't JSON, we still invalidated the product collection tag above.
  }

  return NextResponse.json({
    ok: true,
    slug,
    revalidatedAt: new Date().toISOString(),
  });
}
