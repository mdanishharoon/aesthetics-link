This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## WooCommerce Connection

This storefront now connects to WooCommerce Store API through a Next.js Backend-for-Frontend route at `app/api/woo/[...path]/route.ts`.

### 1) Configure environment

Copy `.env.example` to `.env.local` and set:

```bash
WOOCOMMERCE_STORE_URL=https://checkout.yourdomain.com
NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL=https://checkout.yourdomain.com/checkout
WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET=replace-with-strong-random-secret
REVALIDATE_SECRET=replace-with-strong-random-secret
WOOCOMMERCE_WEBHOOK_SECRET=replace-with-woocommerce-webhook-secret
```

Optional:

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-cloudflare-turnstile-site-key
```

Use the WordPress site URL (the one that serves `/wp-json/wc/store/v1/...`).

### 2) What is wired

- Product listing page (`/products`) uses live Woo products.
- Product detail page (`/products/[slug]`) uses live Woo product data.
- Add-to-cart uses Woo `cart/add-item`.
- Cart page (`/cart`) uses Woo cart totals and line items.
- Checkout button uses `/api/checkout/bridge` to sync cart into Woo session, then redirects to native Woo checkout.
- Login (`/login`), Sign up (`/signup`), and Profile (`/profile`) are wired to `app/api/auth/[action]/route.ts`.
- Verification (`/verify-email`), forgot password (`/forgot-password`), and reset password (`/reset-password`) are wired.
- Clinic/B2B registrations submit business data and default to `clinic_pending` role/status until admin approval.
- Frontend account flows stay on Next.js; Woo subdomain is used for checkout only.

### 3) Notes

- Cart and nonce tokens are persisted in secure HTTP-only cookies by the Next.js API route.
- Checkout bridge signs cart payloads with `WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET` (5-minute TTL).
- Native Woo checkout handles Stripe and other gateway-specific flows.
- Recommended architecture is same apex domain, e.g. `www.yourdomain.com` + `checkout.yourdomain.com`.
- On Woo/WordPress side, set `AL_B2B_CHECKOUT_BRIDGE_SECRET` to the same value as `WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET`.

### 4) Auth and B2B Workflow Backend

This frontend expects custom WordPress REST endpoints under:

- `/wp-json/aesthetics-link/v1/auth/register`
- `/wp-json/aesthetics-link/v1/auth/login`
- `/wp-json/aesthetics-link/v1/auth/me`
- `/wp-json/aesthetics-link/v1/auth/logout`
- `/wp-json/aesthetics-link/v1/auth/request-email-verification`
- `/wp-json/aesthetics-link/v1/auth/verify-email`
- `/wp-json/aesthetics-link/v1/auth/request-password-reset`
- `/wp-json/aesthetics-link/v1/auth/reset-password`
- `/wp-json/aesthetics-link/v1/auth/wholesale-prices`

Install plugin starter:

- `integration/wordpress-plugin/aesthetics-link-b2b-auth/aesthetics-link-b2b-auth.php`

After installation in Woo/WordPress:

- Retail signups become `customer` with clinic status `approved`.
- Clinic signups become `clinic_pending` with clinic status `pending`.
- Retail signups can login immediately; clinic signups must verify email before first login.
- Admin reviews applications in `Users -> Clinic Applications`.
- Approve sets role/status to `wholesale_customer` + `approved`.
- Reject sets role/status to `customer` + `rejected`.

Optional in `wp-config.php`:

```php
define('AL_B2B_FRONTEND_URL', 'https://www.yourdomain.com');
define('AL_B2B_TURNSTILE_SECRET', 'your-cloudflare-turnstile-secret');
define('AL_B2B_CHECKOUT_BRIDGE_SECRET', 'same-value-as-WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET');
```

Wholesale pricing behavior:

- Frontend cards/detail fetch role-aware prices via `/api/auth/wholesale-prices`.
- Wholesale prices render only for `wholesale_customer` with `approved` clinic status.
- Non-wholesale sessions always fall back to retail labels.

### 5) Instant propagation from WooCommerce

The app now supports on-demand invalidation endpoint:

- `POST /api/revalidate/woo`

It accepts either:

- `x-revalidate-token: <REVALIDATE_SECRET>` (or `Authorization: Bearer <REVALIDATE_SECRET>`)
- or WooCommerce webhook signature (`x-wc-webhook-signature`) verified with `WOOCOMMERCE_WEBHOOK_SECRET`

Recommended Woo webhook settings:

- Delivery URL: `https://your-frontend-domain.com/api/revalidate/woo`
- Topic: `Product created`, `Product updated`, `Product deleted`
- Secret: same value as `WOOCOMMERCE_WEBHOOK_SECRET`
