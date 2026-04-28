# Outbound Webhooks (plugin → frontend)

The WordPress plugin (`aesthetics-link-b2b-auth`) dispatches event
notifications to the Next.js frontend so the SPA can react to
server-side changes without polling.

This document is the **contract**: payload shapes, signature
verification, retry semantics. The frontend webhook receivers that
consume these events are not yet implemented (Phase 4 work, deferred
per project decision); this contract is the input to that future
implementation.

---

## Wire format

Every webhook is a single `POST` request:

```
POST <config.webhooks.target_url>
Host: <frontend host>
Content-Type: application/json
Accept: application/json
X-AL-B2B-Event: <event id>
X-AL-B2B-Signature: <hex hmac-sha256 of body using shared secret>
X-AL-B2B-Attempt: <n>            # 1 on first try, 2/3 on retry

{
  "event": "<event id>",
  "payload": <event-specific JSON>,
  "sent_at": <unix timestamp>
}
```

The full request body (the JSON envelope above, NOT just the inner
`payload`) is what gets signed. Verify by recomputing
`hmac_sha256(body, secret)` and comparing with `hash_equals`-style
constant-time compare.

---

## Signature verification

The shared secret is `config.webhooks.secret` on the WP side, which a
deployer either sets in `wp-config.php` (`AL_B2B_WEBHOOK_SECRET`) or
on the **Settings → AL B2B → Outbound webhooks** page. Frontend gets
the same value via `WOOCOMMERCE_WEBHOOK_SECRET` (or whatever
environment variable the eventual receiver uses — naming is at the
deployer's discretion).

Reference TypeScript verifier (drop-in for a Next.js Route Handler):

```ts
import crypto from "node:crypto";

export function verifyWebhookSignature(
  rawBody: string,
  signatureHex: string | null,
  secret: string,
): boolean {
  if (!signatureHex) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  // Constant-time compare against the header.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signatureHex, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

**Important**: read `request.text()` first, verify against the raw
body, THEN `JSON.parse()`. Parsing before verifying defeats HMAC.

---

## Retry semantics

The dispatcher (`AL_B2B_Webhook_Dispatcher`) tries delivery up to
`config.webhooks.max_attempts` times (default 3) with backoff
`config.webhooks.backoff_seconds` (default `[0, 30, 120]` seconds).
Retries are queued via `wp_schedule_single_event`, so a deployment
with `DISABLE_WP_CRON` set must run its own cron runner.

The `X-AL-B2B-Attempt` header tells the receiver which attempt this
is. Receivers should be **idempotent** — design your handlers so that
processing the same event twice is safe.

Failures fire a WordPress action `do_action('al_b2b_webhook_failed',
$event, $payload, $error)` after exhausting retries; deployers can
hook this for alerting.

Successes fire `do_action('al_b2b_webhook_dispatched', $event,
$status, $attempt)`.

---

## Events

### `cart.abandoned`

Emitted by `AL_B2B_Module_Abandoned_Cart` from an hourly WP-Cron
sweep. Fires once per cart that has been inactive for at least
`apply_filters('al_b2b_abandoned_cart_threshold_seconds', 3600)`.

After dispatch the row is flipped to `status='abandoned'` so the
event is not emitted twice for the same cart.

```json
{
  "event": "cart.abandoned",
  "payload": {
    "cartToken": "wc_session_<uuid_or_user_id>",
    "userId": 42,
    "email": "buyer@example.com",
    "items": [
      { "key": "abc123", "productId": 17, "variationId": 0, "quantity": 2 }
    ],
    "total": "59.00",
    "currency": "USD",
    "lastSeenAt": "2026-04-28 11:42:13"
  },
  "sent_at": 1714303800
}
```

### `stock.updated`

Emitted by `AL_B2B_Module_Real_Time_Stock` on **single-product**
stock changes — i.e. an admin manually editing stock via the WC
product/variation screen. Fires:

- once per `woocommerce_product_set_stock`
- once per `woocommerce_variation_set_stock`

```json
{
  "event": "stock.updated",
  "payload": {
    "productId": 17,
    "variationId": 19,
    "sku": "SKU-17-VAR-19",
    "stockStatus": "instock",
    "stockQuantity": 3,
    "manageStock": true
  },
  "sent_at": 1714303800
}
```

`variationId` is omitted for non-variation products. `productId` for
a variation refers to the parent product.

### `stock.batch_updated`

Emitted by `AL_B2B_Module_Real_Time_Stock` on **order-driven** stock
reductions — when WC reduces stock for every line item of a placed
order. Batched into one webhook per order, not one per line item, so
a 50-item B2B order produces one HTTP call instead of 50.

```json
{
  "event": "stock.batch_updated",
  "payload": {
    "orderId": 1234,
    "products": [
      {
        "productId": 17,
        "sku": "SKU-17",
        "stockStatus": "instock",
        "stockQuantity": 12,
        "manageStock": true
      },
      {
        "productId": 99,
        "variationId": 102,
        "sku": "SKU-99-V102",
        "stockStatus": "outofstock",
        "stockQuantity": 0,
        "manageStock": true
      }
    ]
  },
  "sent_at": 1714303800
}
```

---

## Adding a new webhook handler (frontend, future Phase 4)

When the receivers are implemented:

1. Create a route under `src/app/api/webhooks/<name>/route.ts` that:
   - Reads the **raw** body with `await request.text()`.
   - Verifies `X-AL-B2B-Signature` against the body using the helper
     above.
   - On verify-fail, returns `401`.
   - On verify-success, parses the body and validates with a zod
     schema imported from `src/types/`.
   - Returns `200` immediately and processes asynchronously
     (e.g. trigger ISR `revalidateTag`, enqueue a downstream job).
2. Add the corresponding event-payload schema to
   `src/types/features/<feature>.ts` so the same shapes are
   shared across emitter (plugin) and receiver (frontend).
3. Update this document with the route path under each event.

---

## Adding a new event (plugin side)

Inside any module that has access to the dispatcher:

```php
$payload = array(/* ...event-specific data... */);
AL_B2B_Plugin::instance()
    ->get_webhook_dispatcher()
    ->dispatch('your.event_name', $payload);
```

Then document the event's payload shape in this file, in the same
section style as the events above.
