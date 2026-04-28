# Codebase Overview

This document is the entry point for anyone joining the project. It
covers the high-level architecture, how the Next.js frontend talks to
WooCommerce, the auth flow step by step, and every environment variable
the codebase reads. The plugin's own internal docs live in
`integration/wordpress-plugin/aesthetics-link-b2b-auth/PLUGIN_NOTES.md`.

---

## Architecture

```
                        ┌─────────────────────────────┐
                        │   Browser (the customer)    │
                        └─────────────┬───────────────┘
                                      │
                                      │  HTTPS, cookies (httpOnly)
                                      ▼
       ┌────────────────────────────────────────────────────────┐
       │              Next.js 16 frontend (this repo)           │
       │                                                        │
       │  app/api/*  ── route handlers proxy to WP/Woo upstream │
       │  lib/woo-client/* ── shared fetch + zod validation     │
       │  lib/storefront/client.ts ── browser cart client       │
       │  lib/auth/client.ts ── browser auth client             │
       │  lib/graphql/client.ts ── server-only GraphQL client   │
       └─────────────┬───────────────────────────┬──────────────┘
                     │                           │
        REST + cookies│                           │GraphQL (server-only)
                     ▼                           ▼
       ┌─────────────────────────────────────────────────────────┐
       │       WooCommerce subdomain (checkout.example.com)      │
       │                                                         │
       │  /wp-json/wc/store/v1/*    ── native WC Store API       │
       │  /wp-json/aesthetics-link/v1/*  ── custom plugin routes │
       │  /graphql                  ── WPGraphQL                 │
       │  /checkout                 ── classic WC checkout       │
       │                                                         │
       │  Plugin: aesthetics-link-b2b-auth (PHP, modular)        │
       │    ├─ auth strategies (opaque session / JWT)            │
       │    ├─ feature modules (membership, wholesale,           │
       │    │   newsletter, reviews, wishlist, abandoned cart…)  │
       │    └─ webhook dispatcher (HMAC-signed outbound)         │
       └─────────────────────────────────────────────────────────┘
```

The frontend never reaches WooCommerce directly from the browser.
Every browser → WP request goes through a Next.js API route that
forwards the call (and any cookies) upstream. This keeps secrets
server-side, lets us enforce input validation at the boundary, and
gives the typed `lib/woo-client/*` core a single chokepoint to rate
limit / observe / retry.

---

## Repository layout

```
aesthetics-link/
├── src/
│   ├── app/                       Next.js App Router pages + API routes
│   │   ├── api/
│   │   │   ├── auth/[action]/     auth proxy (login, register, …)
│   │   │   ├── checkout/          bridge + completion redirects
│   │   │   ├── orders/            lookup, details, receipt
│   │   │   ├── products/reviews/  reviews
│   │   │   ├── marketing/track/   event ingest passthrough
│   │   │   ├── newsletter/        signup
│   │   │   ├── revalidate/woo/    HMAC-verified ISR webhook
│   │   │   ├── storefront/        navigation, etc.
│   │   │   └── woo/[...path]/     WC Store API proxy
│   │   └── …pages…
│   ├── components/                React components
│   ├── hooks/                     Custom hooks
│   ├── lib/
│   │   ├── api-validate.ts        zod-based request validation helper
│   │   ├── auth/                  AuthApiError + browser auth client
│   │   ├── graphql/               server-only GraphQL client
│   │   ├── marketing/             marketing customer-type/region helpers
│   │   ├── storefront/            cart client + storefront server fetcher
│   │   ├── utils/                 shared utilities
│   │   └── woo-client/            shared fetch core (errors, validate, fetch)
│   ├── types/                     zod schemas + inferred types (single SoT)
│   │   ├── api/                   request/response/auth shapes
│   │   ├── features/              wishlist, newsletter, marketing, search
│   │   └── woocommerce/           product/cart/order/review/customer/coupon
│   └── data/                      static enrichment data
├── integration/
│   └── wordpress-plugin/
│       └── aesthetics-link-b2b-auth/   PHP plugin (see PLUGIN_NOTES.md)
├── public/                        static assets
├── docs/
│   ├── audit/phase-1/             1A frontend audit, 1B plugin audit
│   └── plans/                     phase-2.md, phase-3.md
├── .env.example                   environment template (committed)
├── tsconfig.json                  strict + noUncheckedIndexedAccess +
│                                  exactOptionalPropertyTypes
├── next.config.ts
├── package.json
└── pnpm-lock.yaml                 canonical lockfile (package-lock.json
                                    is stale; pnpm is the package manager)
```

---

## How the frontend talks to WooCommerce

Three distinct paths:

### 1. Browser → Next.js → WP REST proxy (most calls)

`fetch('/api/auth/login')` → handler in `src/app/api/auth/[action]/route.ts`
validates the body (zod), forwards it to
`https://<wp>/wp-json/aesthetics-link/v1/auth/login` with the
session cookie set as a Bearer header, returns the upstream response
back to the browser.

Same shape for `/api/orders/lookup`, `/api/products/reviews`,
`/api/marketing/track`, `/api/newsletter/subscribe`.

### 2. Browser → Next.js → WC Store API proxy (cart & checkout state)

`/api/woo/[...path]/route.ts` is a generic proxy for
`/wp-json/wc/store/v1/*`. Forwards cart/cookie state and adds a
network-error retry loop (up to 3 attempts on idempotent methods).

### 3. Server-only → GraphQL (catalog data for SSR)

`src/lib/graphql/client.ts` runs in Server Components. It queries
WPGraphQL directly (not through a Next.js API route) and now optionally
validates the response shape with a zod schema. The `errors[]` array
is checked and surfaced as a `WooClientError`.

---

## Authentication flow (step by step)

```
┌──────────┐         ┌──────────┐         ┌──────────────────┐
│ Browser  │         │ Next.js  │         │ WordPress + AL   │
└─────┬────┘         └─────┬────┘         └────────┬─────────┘
      │                    │                       │
      │ POST /api/auth/login (email, password)     │
      ├───────────────────►│                       │
      │                    │ POST /wp-json/AL/v1/auth/login
      │                    ├──────────────────────►│
      │                    │                       │ wp_authenticate()
      │                    │                       │ AL_B2B_Auth_Opaque_
      │                    │                       │   Session_Strategy
      │                    │                       │   ::issue_session()
      │                    │ 200 {user, session_token}
      │                    │◄──────────────────────┤
      │                    │ Set-Cookie: al_session_token=…
      │                    │   (httpOnly, Secure, SameSite=Lax, 30d)
      │ 200 {user}         │
      │◄───────────────────┤
      │                    │
      │ … later: any browser request hits Next.js with the cookie …
      │                    │
      │ GET /api/woo/cart  │                       │
      ├───────────────────►│                       │
      │                    │ GET /wp-json/wc/store/v1/cart
      │                    │   Authorization: Bearer al_session_token
      │                    ├──────────────────────►│ AL strategy resolves
      │                    │                       │   user from token,
      │                    │                       │   filter
      │                    │                       │   determine_current_user
      │                    │ 200 {cart for that user}
      │                    │◄──────────────────────┤
      │ 200 {cart}         │
      │◄───────────────────┤
```

**Key points**

- The session token is **opaque** (32 random bytes, hex-encoded). It
  carries no claims; the server side resolves it to a user via a hashed
  lookup in `wp_al_b2b_sessions`.
- Cookie attributes: `httpOnly` (no JS access), `Secure` in production,
  `SameSite=Lax`, `path=/`, `maxAge` 30 days.
- Logout deletes the cookie and the DB session row; password reset
  invalidates **every** session for the user.
- The plugin can be reconfigured to use stateless JWT instead via
  `define('AL_B2B_AUTH_STRATEGY', 'jwt')`. Per-token revocation is
  not supported in JWT mode; `revoke_all_sessions` rolls a per-user
  version meta to invalidate all outstanding tokens.

### Checkout bridge (SPA → WC checkout hand-off)

A separate signed-redirect flow:

1. User clicks "Proceed to checkout" on the SPA.
2. Browser hits `GET /api/checkout/bridge`.
3. Next.js builds `{ cartToken, userId, iat, exp }`, signs with
   `WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET` (HMAC-SHA256), redirects to
   `<wp>/wp-json/aesthetics-link/v1/checkout/bridge?…&sig=…`.
4. Plugin verifies signature, hydrates the WC cart from
   `cartToken`, logs the user in to WC's session, redirects to
   `wc_get_checkout_url()`.

The signing secret must be identical on both sides.

### Order receipt (post-checkout return)

WC's order-thankyou redirect is filtered by the plugin's
`Module_Order_Receipt` to redirect back to the frontend with a signed
`receipt` token. The frontend then calls
`GET /aesthetics-link/v1/orders/confirmation?receipt=…` to fetch the
order shape.

---

## Type safety

After Phase 2:

- `tsconfig.json` runs with `strict: true`, plus
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`.
- Zero `any`, zero `@ts-ignore`/`@ts-expect-error`, zero unsafe
  `as` casts. Every external-data boundary is validated with a zod
  schema before the data is trusted.
- The `src/types/` directory is the single source of truth: schemas
  are defined first, static types are derived via `z.infer<typeof X>`.

Verify with `npx tsc --noEmit` (must be clean) and
`pnpm build` (must succeed end-to-end).

---

## Environment variables

Loaded at runtime via `process.env`. **Server-only** unless prefixed
`NEXT_PUBLIC_`.

| Variable | Server / Client | Required? | Purpose |
|---|---|---|---|
| `WOOCOMMERCE_STORE_URL` | server | yes | Base URL of the WordPress + WooCommerce site (no trailing slash). |
| `WORDPRESS_GRAPHQL_URL` | server | yes for SSR catalog | WPGraphQL endpoint. |
| `WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET` | server | yes | HMAC secret for the SPA → WC checkout redirect. Must equal the plugin's `AL_B2B_CHECKOUT_BRIDGE_SECRET`. |
| `REVALIDATE_SECRET` | server | yes | Static token validating `/api/revalidate/woo` — pair with HMAC. |
| `WOOCOMMERCE_WEBHOOK_SECRET` | server | yes | HMAC secret for inbound WooCommerce native webhooks (currently consumed by `/api/revalidate/woo`). |
| `STOREFRONT_BRAND_ORDER` | server | optional | Comma-separated brand slugs to pin filter ordering. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | client | optional | Cloudflare Turnstile site key. Required when the plugin's `AL_B2B_TURNSTILE_SECRET` is set. |
| `NODE_ENV` | both | runtime-set | Used to flip cookies between `Secure: true` (production) and `false`. |
| *(legacy)* `AL_B2B_CHECKOUT_BRIDGE_SECRET` | server | optional fallback | Read in `app/api/checkout/bridge/route.ts` only if `WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET` is empty. Documented for backward compat with older deployments. |

### Notes on `.env.example`

`.env.example` is committed at the repo root. **`NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL`** is listed there but is no longer referenced from code (vestigial from a pre-Phase-2 design). Leave it for now to avoid confusing existing deployers; remove on the next env audit.

`.env`, `.env.local`, `.env.production` etc. are gitignored via the
`.env*` rule (with `.env.example` already tracked, so it stays).

---

## Lockfile

The repo has both `package-lock.json` and `pnpm-lock.yaml`. **Use
pnpm** (`pnpm install`, `pnpm add`, `pnpm build`). The npm lockfile is
a leftover from an earlier setup and should not be regenerated.

---

## Useful commands

```bash
pnpm install            # install deps
pnpm dev                # start Next.js dev server
pnpm build              # production build (catches all type + Next-route issues)
npx tsc --noEmit        # type-check only
npm run lint            # eslint
```

PHP side (run from the plugin directory):

```bash
php -l <file>           # syntax check a single file
```

---

## Where to look next

- **Plugin internals**: `integration/wordpress-plugin/aesthetics-link-b2b-auth/PLUGIN_NOTES.md`
- **Webhook contracts** (events emitted by the plugin to the frontend): `WEBHOOKS.md`
- **Phase audits / plans** (historical decisions): `docs/audit/`, `docs/plans/`
