This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
REVALIDATE_SECRET=replace-with-strong-random-secret
WOOCOMMERCE_WEBHOOK_SECRET=replace-with-woocommerce-webhook-secret
```

Use the WordPress site URL (the one that serves `/wp-json/wc/store/v1/...`).

### 2) What is wired

- Product listing page (`/products`) uses live Woo products.
- Product detail page (`/products/[slug]`) uses live Woo product data.
- Add-to-cart uses Woo `cart/add-item`.
- Cart page (`/cart`) uses Woo cart totals and line items.
- Checkout button redirects users to native Woo checkout (`NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL`).

### 3) Notes

- Cart and nonce tokens are persisted in secure HTTP-only cookies by the Next.js API route.
- Native Woo checkout handles Stripe and other gateway-specific flows.
- Recommended architecture is same apex domain, e.g. `www.yourdomain.com` + `checkout.yourdomain.com`.
- On Woo/WordPress side, configure cookies/session for subdomain compatibility (for example, `COOKIE_DOMAIN=.yourdomain.com`).

### 4) Instant propagation from WooCommerce

The app now supports on-demand invalidation endpoint:

- `POST /api/revalidate/woo`

It accepts either:

- `x-revalidate-token: <REVALIDATE_SECRET>` (or `Authorization: Bearer <REVALIDATE_SECRET>`)
- or WooCommerce webhook signature (`x-wc-webhook-signature`) verified with `WOOCOMMERCE_WEBHOOK_SECRET`

Recommended Woo webhook settings:

- Delivery URL: `https://your-frontend-domain.com/api/revalidate/woo`
- Topic: `Product created`, `Product updated`, `Product deleted`
- Secret: same value as `WOOCOMMERCE_WEBHOOK_SECRET`
