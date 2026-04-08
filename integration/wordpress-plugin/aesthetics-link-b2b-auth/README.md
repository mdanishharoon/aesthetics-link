# AestheticsLink B2B Auth Plugin

This plugin exposes custom WordPress REST endpoints for the Next.js frontend auth flow:

- `POST /wp-json/aesthetics-link/v1/auth/register`
- `POST /wp-json/aesthetics-link/v1/auth/login`
- `GET /wp-json/aesthetics-link/v1/auth/me`
- `POST /wp-json/aesthetics-link/v1/auth/logout`
- `POST /wp-json/aesthetics-link/v1/auth/request-email-verification`
- `POST /wp-json/aesthetics-link/v1/auth/verify-email`
- `POST /wp-json/aesthetics-link/v1/auth/request-password-reset`
- `POST /wp-json/aesthetics-link/v1/auth/reset-password`
- `GET /wp-json/aesthetics-link/v1/auth/wholesale-prices?ids=1,2,3`

It also creates roles:

- `clinic_pending`
- `wholesale_customer`

It creates database tables:

- `wp_al_b2b_sessions` for session tokens
- `wp_al_b2b_audit_log` for approve/reject audit trail

## Install

1. Copy `aesthetics-link-b2b-auth.php` to `wp-content/plugins/aesthetics-link-b2b-auth/`.
2. Activate plugin in WordPress Admin.

## Approval workflow

1. Retail signup -> role `customer`, clinic status `approved`.
2. Clinic signup -> role `clinic_pending`, clinic status `pending`.
3. In WordPress Admin open `Users -> Clinic Applications`.
4. Review submitted business details.
5. Click:
   - `Approve` -> role becomes `wholesale_customer`, clinic status becomes `approved`.
   - `Reject` -> role becomes `customer`, clinic status becomes `rejected`.

## Email verification and reset

1. Registration creates account with `al_email_verified=0`.
2. Verification email links to frontend `/verify-email?token=...`.
3. Clinic/B2B login is blocked until verification succeeds (retail can login immediately).
4. Password reset links to frontend `/reset-password?token=...`.

## Checkout bridge

The plugin supports a signed checkout bridge query handled on `template_redirect`:

- Query: `?al_b2b_checkout_bridge=<payload>&sig=<signature>`
- Payload includes the Woo Store API cart token and expiry.
- Valid requests hydrate Woo session cart, then redirect to native Woo checkout.

## Optional constants (wp-config.php)

```php
define('AL_B2B_FRONTEND_URL', 'https://www.yourdomain.com');
define('AL_B2B_TURNSTILE_SECRET', 'your-cloudflare-turnstile-secret');
define('AL_B2B_CHECKOUT_BRIDGE_SECRET', 'same-value-as-WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET');
```

- `AL_B2B_FRONTEND_URL` controls where verification/reset links point.
- `AL_B2B_TURNSTILE_SECRET` enables CAPTCHA validation on auth endpoints.
- `AL_B2B_CHECKOUT_BRIDGE_SECRET` must match frontend `WOOCOMMERCE_CHECKOUT_BRIDGE_SECRET`.

## Notes

- Session tokens are opaque, stored server-side in `wp_al_b2b_sessions`.
- Expired sessions are cleaned by hourly WP-Cron event `al_b2b_cleanup_sessions_event`.
- Tokens are returned to Next.js BFF and set as `HttpOnly` cookie on frontend domain.
- Approve/reject actions are logged to `wp_al_b2b_audit_log`.
