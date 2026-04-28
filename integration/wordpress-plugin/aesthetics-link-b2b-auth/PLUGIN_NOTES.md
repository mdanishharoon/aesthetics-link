# AestheticsLink B2B Auth — Plugin Notes

Internal reference for the plugin after the Phase 3 refactor. Not a
public README; lives next to the plugin so future maintainers can pick
it up without re-reading every file.

---

## What this plugin does

A bridge between the Next.js storefront and WooCommerce. It owns:

- **Authentication** — server-issued opaque session tokens (default) or
  JWT (alternative), plus the Store API auth bridge so logged-in users
  see their own cart on the headless side.
- **B2B membership workflow** — clinic-style account approval with audit
  log and admin UI.
- **Wholesale pricing engine** — variation > product > category > global
  discount resolution wired into WC's product price filters.
- **Newsletter** — local subscriber table plus a built-in Brevo CRM
  driver, and an `al_b2b_newsletter_signup` action hook for additional
  listeners (Mailchimp, Klaviyo, custom).
- **Marketing event ingest** — pageview / signup / etc. events streamed
  from the storefront into a custom DB table.
- **Reviews** — headless wrapper around WC's native comment-based
  reviews.
- **Checkout bridge + order receipt** — HMAC-signed redirect from the
  SPA to WC's checkout, plus a signed-receipt endpoint for the
  thankyou page.
- **New feature modules (Phase 3)** — Wishlist, Abandoned Cart,
  Coupons, Real-time Stock, Faceted Search.
- **Documented stubs (Phase 3)** — Subscriptions, Multi-currency,
  Multi-language. Integration points are commented; logic is not yet
  wired.

---

## Architecture

```
aesthetics-link-b2b-auth/
├── aesthetics-link-b2b-auth.php      bootstrap: constants, requires,
│                                     plugin->boot(), legacy globals
├── config/default-config.php         resolves config from
│                                     constants > saved option > defaults
├── includes/
│   ├── class-plugin.php              singleton orchestrator
│   ├── class-loader.php              optional hook-queue helper
│   ├── class-modules.php             module registry + toggle gate
│   ├── interface-module.php
│   ├── interface-module-with-schema.php
│   ├── interface-auth-strategy.php
│   ├── auth/
│   │   ├── class-opaque-session-strategy.php   (default)
│   │   └── class-jwt-strategy.php              (alternative)
│   ├── api/
│   │   ├── class-base-rest-controller.php
│   │   └── class-auth-controller.php
│   ├── modules/                      one file per module
│   ├── services/
│   │   └── class-webhook-dispatcher.php
│   └── admin/
│       ├── class-settings.php
│       └── class-admin.php
└── PLUGIN_NOTES.md                   this file
```

**Boot order** (file scope of the main plugin file):

1. `defined() || define()` for every legacy constant.
2. `require_once` for every class.
3. `AL_B2B_Plugin::instance()->boot()` — registers modules, drains
   the loader, attaches admin + webhook-retry hooks.
4. Legacy `add_action` / `add_filter` calls for the few hooks not yet
   migrated into modules (e.g. `determine_current_user`).

---

## Module registry

| Module ID | Default | Source of truth | Notes |
|---|---|---|---|
| `membership_approval` | ON  | `class-module-membership-approval.php` | Clinic Applications admin page |
| `wholesale_pricing`   | ON  | `class-module-wholesale-pricing.php`   | 6 WC price filters + 8 admin field hooks + `/auth/wholesale-prices` |
| `newsletter`          | ON  | `class-module-newsletter.php`          | `/newsletter/{subscribe,webhook}` + Brevo + Marketing Controls page |
| `marketing_events`    | ON  | `class-module-marketing-events.php`    | `/marketing/track` |
| `reviews`             | ON  | `class-module-reviews.php`             | `/products/reviews` GET + POST |
| `checkout_bridge`     | ON  | `class-module-checkout-bridge.php`     | `/checkout/bridge` + SPA subdomain lock |
| `order_receipt`       | ON  | `class-module-order-receipt.php`       | `/orders/{lookup,confirmation}` + return-URL filter |
| `wishlist`            | OFF | `class-module-wishlist.php`            | `/wishlist`, user-meta storage |
| `abandoned_cart`      | OFF | `class-module-abandoned-cart.php`      | `/cart/recovered` + cron + `cart.abandoned` webhook + DB table |
| `coupons`             | OFF | `class-module-coupons.php`             | `/coupons/{validate,apply}` |
| `real_time_stock`     | OFF | `class-module-real-time-stock.php`     | `/products/{id}/stock` + `stock.{updated,batch_updated}` webhooks |
| `faceted_search`      | OFF | `class-module-faceted-search.php`      | `/products/search` with facet counts (capped 500-row sample) |
| `subscriptions`       | OFF | stub                                    | Documents WC Subscriptions integration |
| `multi_currency`      | OFF | stub                                    | Documents WOOCS / Aelia integration |
| `multi_language`      | OFF | stub                                    | Documents WPML / Polylang integration |

**Toggle methods** (highest precedence first):

1. `define('AL_B2B_…')` constants in `wp-config.php`.
2. Saved option from **Settings → AL B2B**.
3. Hard-coded defaults in `default-config.php`.

The `al_b2b_config` filter runs over the final array if a deployer
needs to mutate it programmatically.

---

## Configuration reference

| Key | Constant override | Settings page | Description |
|---|---|---|---|
| `frontend_url` | `AL_B2B_FRONTEND_URL` | yes | Storefront base URL — used for redirects, email links |
| `auth_strategy` | `AL_B2B_AUTH_STRATEGY` | yes (radio) | `opaque_session` (default) or `jwt` |
| `jwt_secret` | `AL_B2B_AUTH_JWT_SECRET` | yes (password field) | Required when `auth_strategy=jwt` |
| `newsletter_driver` | `AL_B2B_NEWSLETTER_DRIVER` | yes (select) | `brevo` (default) or `none` |
| `webhooks.target_url` | `AL_B2B_WEBHOOK_TARGET_URL` | yes | Where outbound webhooks post |
| `webhooks.secret` | `AL_B2B_WEBHOOK_SECRET` | yes (password field) | HMAC-SHA256 key for outbound webhook signing |
| `roles.pending` | `AL_B2B_ROLE_PENDING` | no | Default `clinic_pending` |
| `roles.approved` | `AL_B2B_ROLE_APPROVED` | no | Default `wholesale_customer` |
| `webhooks.max_attempts` | — | no | Default 3 |
| `webhooks.backoff_seconds` | — | no | Default `[0, 30, 120]` |

**Other constants the plugin reads** (not in the settings shape):

- `AL_B2B_TURNSTILE_SECRET` — Cloudflare Turnstile site secret. Optional;
  when set, captcha is required on register/login/verify/reset endpoints.
- `AL_B2B_BREVO_API_KEY` — required when `newsletter_driver=brevo`.
- `AL_B2B_BREVO_LIST_ID` — Brevo list ID for newsletter signups.
- `AL_B2B_BREVO_WEBHOOK_SECRET` — shared secret for Brevo's inbound webhook.
- `AL_B2B_CHECKOUT_BRIDGE_SECRET` — HMAC secret for the SPA → WC
  checkout redirect. Must match the frontend's
  `WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET`.
- `AL_B2B_DEV_FRONTEND_URL` + `AL_B2B_ENABLE_DEV_FRONTEND_OVERRIDE` —
  local-environment override for the frontend URL.

---

## DB tables

| Table | Created by | Purpose |
|---|---|---|
| `wp_al_b2b_sessions`             | `al_b2b_create_tables()` | Opaque session tokens (hashed) |
| `wp_al_b2b_audit_log`            | `al_b2b_create_tables()` | Membership-approval audit trail |
| `wp_al_b2b_newsletter_subscribers` | `al_b2b_create_tables()` | Newsletter subscriber state |
| `wp_al_b2b_marketing_events`     | `al_b2b_create_tables()` | Marketing event log |
| `wp_al_b2b_abandoned_carts`      | `AL_B2B_Module_Abandoned_Cart::install_schema()` | Abandoned cart tracking |

Modules with their own schema implement `AL_B2B_Module_With_Schema` and
provide `install_schema()`. `al_b2b_create_tables()` iterates every
registered module — even disabled ones — and calls it. Cost: one empty
unused table per disabled schema-aware module. Benefit: flipping a
module on later doesn't need plugin reactivation.

---

## REST surface

Namespace: `aesthetics-link/v1`. Routes are registered by their owning
module/controller.

```
GET    /auth/me                        AL_B2B_Auth_Controller
POST   /auth/login                     AL_B2B_Auth_Controller
POST   /auth/register                  AL_B2B_Auth_Controller
POST   /auth/logout                    AL_B2B_Auth_Controller
GET    /auth/dashboard                 AL_B2B_Auth_Controller
GET    /auth/order                     AL_B2B_Auth_Controller
GET    /auth/orders                    AL_B2B_Auth_Controller
POST   /auth/profile                   AL_B2B_Auth_Controller
POST   /auth/request-email-verification AL_B2B_Auth_Controller
POST   /auth/verify-email              AL_B2B_Auth_Controller
POST   /auth/request-password-reset    AL_B2B_Auth_Controller
POST   /auth/reset-password            AL_B2B_Auth_Controller

GET    /auth/wholesale-prices          Module_Wholesale_Pricing

POST   /newsletter/subscribe           Module_Newsletter
POST   /newsletter/webhook             Module_Newsletter (Brevo ingest)

POST   /marketing/track                Module_Marketing_Events

GET    /products/reviews               Module_Reviews
POST   /products/reviews               Module_Reviews

GET    /checkout/bridge                Module_Checkout_Bridge
POST   /orders/lookup                  Module_Order_Receipt
GET    /orders/confirmation            Module_Order_Receipt

GET    /wishlist                       Module_Wishlist     [auth required]
POST   /wishlist/add                   Module_Wishlist     [auth required]
DELETE /wishlist/remove                Module_Wishlist     [auth required]

POST   /cart/recovered                 Module_Abandoned_Cart

POST   /coupons/validate               Module_Coupons
POST   /coupons/apply                  Module_Coupons

GET    /products/{id}/stock            Module_Real_Time_Stock
GET    /products/search                Module_Faceted_Search
```

Auth on every route is currently `__return_true` with the callback
performing the check, except `/wishlist/*` which uses
`AL_B2B_Base_REST_Controller::permission_authenticated()`. Tightening
the rest is on the cleanup backlog.

---

## Outbound webhooks

Dispatched via `AL_B2B_Plugin::instance()->get_webhook_dispatcher()->dispatch($event, $payload)`.

| Event | Source | Payload |
|---|---|---|
| `cart.abandoned`     | Module_Abandoned_Cart cron | `{ cartToken, userId, email, items[], total, currency, lastSeenAt }` |
| `stock.updated`      | Module_Real_Time_Stock (single product / variation set) | `{ productId, variationId?, sku, stockStatus, stockQuantity, manageStock }` |
| `stock.batch_updated`| Module_Real_Time_Stock (order line stock reduction) | `{ orderId, products: [...] }` |

**Wire format**

```
POST <config.webhooks.target_url>
Content-Type: application/json
X-AL-B2B-Event: <event id>
X-AL-B2B-Signature: hex( hmac_sha256(body, secret) )
X-AL-B2B-Attempt: <n>

{ "event": "<id>", "payload": { ... }, "sent_at": <unix> }
```

**Retry**: configurable `max_attempts` (default 3) with backoff
schedule in seconds (default `[0, 30, 120]`) via WP-Cron.

**Observability hooks**:

```php
do_action( 'al_b2b_webhook_dispatched', $event, $status_code, $attempt );
do_action( 'al_b2b_webhook_failed',     $event, $payload, $error_message );
```

---

## Filter / action hooks the plugin exposes

| Hook | Args | Purpose |
|---|---|---|
| `al_b2b_config` (filter) | `array $config` | Mutate the resolved config array |
| `al_b2b_newsletter_signup` (action) | `string $email, array $meta` | Custom listener for newsletter events |
| `al_b2b_webhook_dispatched` (action) | `string $event, int $status, int $attempt` | Logging / metrics |
| `al_b2b_webhook_failed` (action) | `string $event, array $payload, string $error` | Logging / alerting |
| `al_b2b_order_receipt_ttl` (filter) | `int $ttl` | Override receipt token TTL |
| `al_b2b_frontend_base_url` (filter) | `string $url` | Mutate computed frontend URL |
| `al_b2b_hidden_order_statuses` (filter) | `array $statuses` | Hide additional statuses from guest order lookup |
| `al_b2b_abandoned_cart_threshold_seconds` (filter) | `int $seconds` | Inactivity window before a cart is flagged abandoned (default 3600) |

---

## Adding a new module

1. Create `includes/modules/class-module-<name>.php`.
2. Implement `AL_B2B_Module_Interface`. If you need DB tables, also
   implement `AL_B2B_Module_With_Schema`.
3. Register the file in the bootstrap `require_once` block of
   `aesthetics-link-b2b-auth.php`.
4. Register the instance in `AL_B2B_Plugin::boot()`:
   ```php
   $this->modules->register(new AL_B2B_Module_Foo($dep1, $dep2));
   ```
5. Add the module ID to the defaults in
   `AL_B2B_Settings::default_module_flags()` (default OFF for new
   features, ON for behaviour-preserving migrations).

The toggle resolver picks it up automatically; the settings page
exposes its checkbox without further changes.

---

## Accepted risks

These were flagged in the Phase 1B audit and intentionally NOT changed
in Phase 3:

- **Account enumeration on `/auth/register`** — returns 409
  `email_exists` for already-taken emails. Mitigations: Cloudflare
  Turnstile (when configured) gates the endpoint; transient-backed IP
  rate limit blocks brute-force. Switching to a 204 + email-on-conflict
  flow would break legitimate user UX.
- **`__return_true` on most REST routes** — auth is enforced inside
  each callback. The `permission_authenticated()` helper on
  `AL_B2B_Base_REST_Controller` is the path forward; only `/wishlist/*`
  uses it today.
- **Faceted-search facet cap** — facet counts are computed against the
  first 500 products of the filtered set. Fine for catalogues under a
  few thousand SKUs; deployers with larger catalogues should swap in
  an external index.

---

## Phase 3 commit map

The Phase 3 history is broken into named sub-phases for git-bisect
friendliness:

```
3a   add OOP scaffolding alongside monolith
3b   extract auth into pluggable strategies + base REST controller
3c   add Webhook_Dispatcher service
3d.1 extract Auth_Controller
3d.2 extract Wholesale_Pricing module
3d.3 extract Membership_Approval module
3d.4 extract Newsletter module
3d.5-3d.7 extract Marketing/Reviews/Checkout/OrderReceipt modules
3e.1 add Wishlist module
3e.2 add Abandoned_Cart module + Module_With_Schema interface
3e.3-3e.5 add Coupons, Real-time Stock, Faceted Search modules
3e.6-3e.8 add Subscriptions/MultiCurrency/MultiLanguage stubs
3f   admin settings page with constant-precedence overrides
3g   apply Phase 1B audit fixes (rate limit, debug-gating)
3h   PLUGIN_NOTES.md (this file)
```

---

## Known follow-ups (not in Phase 3)

- **Move global function bodies into class methods.** All Phase 3d
  modules are "facade" wrappers — they register the existing global
  functions on hooks. The function bodies still live in the monolith.
  A future cleanup phase can move them into class methods without
  changing any callers.
- **Tighten REST `permission_callback` from `__return_true`** to
  `permission_authenticated()` for routes that already require auth
  inside the callback. Belt-and-braces, no behaviour change.
- **Add per-user rate limiting** for authenticated routes. The current
  IP-based limiter penalises shared NATs.
