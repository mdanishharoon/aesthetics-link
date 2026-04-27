# Phase 3 — Plugin Refactor (Plan, revised)

**Status:** scope confirmed by user 2026-04-28. Sub-phase 3a in progress.

**Scope (revised):** in-place refactor of `integration/wordpress-plugin/
aesthetics-link-b2b-auth/`. No identity stripping in this phase — prefixes
(`al_b2b_*`, `AL_B2B_*`), REST namespace (`aesthetics-link/v1`), table
names (`wp_al_b2b_*`), and the existing role names stay as-is. Template
extraction is a future phase.

**Out of scope:** building a parallel template directory; renaming
constants/functions; rewriting role names. (All deferred.)

---

## Goal of this phase

Lift the 4,827-line monolith to a maintainable, testable, modular plugin
without changing observable behaviour. Add the new feature modules and
audit fixes the brief calls for. Ship a real admin settings page.

---

## Approach: incremental, behaviour-preserving

The plugin is alive on production. The refactor strategy is:

1. **Build scaffolding alongside the monolith** (3a). Empty classes for
   `Plugin`, `Loader`, `Modules`, `Auth_Strategy_Interface`,
   `Module_Interface`. `aesthetics-link-b2b-auth.php` keeps doing what it
   does today; it just also loads the scaffolding.

2. **Migrate one responsibility per commit.** Move auth functions to an
   auth strategy class. Move webhook dispatcher to a service class. Move
   wholesale-pricing to its module. Each migration:
   - extracts code to a class
   - updates the bootstrap file to invoke via the class
   - removes the old global function (or leaves it as a thin wrapper if
     still hooked by name elsewhere — the audit found no external hooks
     so wrappers should be unnecessary)
   - PHP `php -l` syntax-clean

3. **Add new modules and features as native class-based code** (3e). They
   never live in the monolith.

4. **At the end of phase 3, the monolith file should contain only**:
   plugin header, a require for the autoloader, `Plugin::instance()->boot()`,
   and the activation/deactivation hooks. < 100 lines.

The order ensures the plugin keeps working at every commit — never a
half-rewired state on disk.

---

## Sub-phases

| # | Output | Pause for review? |
|---|---|---|
| **3a** | Scaffolding: directory tree, interfaces, `Plugin`/`Loader`/`Modules` classes, `config/default-config.php`, autoloader. Monolith unchanged. | **YES** |
| **3b** | Auth Strategy interface + Opaque-Session strategy (default, current behaviour) + JWT strategy (alt, ships but disabled). Migrate every auth-related global function. | — |
| **3c** | Webhook Dispatcher service. HMAC-SHA256, WP-Cron retry. Used by 3d/3e modules. | — |
| **3d** | Port existing functionality into modules: `Membership_Approval` (ex-clinic), `Wholesale_Pricing` (split per Q4), `Newsletter` (Brevo as built-in driver + `do_action('al_b2b_newsletter_signup')` layer), `Marketing_Events`, `Reviews`, `Checkout_Bridge`, `Order_Receipt`. Behaviour-preserving. | **YES** |
| **3e** | New feature modules: `Wishlist`, `Abandoned_Cart`, `Coupons`, `Real_Time_Stock`, `Faceted_Search`. Stub modules: `Subscriptions`, `Multi_Currency`, `Multi_Language`. | **YES** |
| **3f** | Admin Settings page rebuilt with proper sections: auth strategy + credentials, frontend URL, feature toggles, webhook secret, cron schedule, newsletter provider. | — |
| **3g** | Phase 1B audit fixes: `/marketing/track` rate limit, `error_log` `WP_DEBUG`-gating, register-enumeration tightening, plus anything new found during refactor. | — |
| **3h** | `PLUGIN_NOTES.md` (internal docs — every config option, every module, every extension point, every WP option/meta key). NOT the template README. | — |

---

## File layout (target, inside the existing plugin directory)

```
integration/wordpress-plugin/aesthetics-link-b2b-auth/
├── aesthetics-link-b2b-auth.php          # bootstrap, < 100 lines (target)
├── README.md                              # existing
├── PLUGIN_NOTES.md                        # produced in 3h
├── config/
│   └── default-config.php                 # default config values + override hook
├── includes/
│   ├── class-plugin.php                   # orchestrator (Plugin::instance()->boot())
│   ├── class-loader.php                   # hook registry helper
│   ├── class-modules.php                  # toggle resolver
│   ├── interface-module.php
│   ├── interface-auth-strategy.php
│   ├── auth/
│   │   ├── class-opaque-session-strategy.php
│   │   └── class-jwt-strategy.php
│   ├── api/
│   │   ├── class-base-rest-controller.php
│   │   ├── class-auth-controller.php
│   │   ├── class-products-controller.php
│   │   ├── class-cart-controller.php
│   │   ├── class-orders-controller.php
│   │   ├── class-customers-controller.php
│   │   ├── class-coupons-controller.php
│   │   ├── class-reviews-controller.php
│   │   ├── class-wishlist-controller.php
│   │   ├── class-search-controller.php
│   │   ├── class-newsletter-controller.php
│   │   ├── class-marketing-controller.php
│   │   ├── class-checkout-controller.php
│   │   └── class-subscriptions-controller.php
│   ├── modules/
│   │   ├── class-module-membership-approval.php   # ex-clinic
│   │   ├── class-module-wholesale-pricing.php
│   │   ├── class-module-newsletter.php
│   │   ├── class-module-marketing-events.php
│   │   ├── class-module-reviews.php
│   │   ├── class-module-wishlist.php
│   │   ├── class-module-abandoned-cart.php
│   │   ├── class-module-coupons.php
│   │   ├── class-module-real-time-stock.php
│   │   ├── class-module-faceted-search.php
│   │   ├── class-module-subscriptions.php       # stub
│   │   ├── class-module-multi-currency.php      # stub
│   │   └── class-module-multi-language.php      # stub
│   ├── newsletter-drivers/
│   │   ├── interface-newsletter-driver.php
│   │   ├── class-brevo-driver.php
│   │   ├── class-mailchimp-driver-example.php   # documented stub
│   │   └── class-klaviyo-driver-example.php     # documented stub
│   ├── services/
│   │   ├── class-webhook-dispatcher.php
│   │   ├── class-rate-limiter.php
│   │   └── class-audit-log.php
│   ├── db/
│   │   └── class-installer.php                  # CREATE TABLE on activation
│   └── admin/
│       ├── class-admin.php
│       └── class-settings.php
└── languages/
```

Target 200–400 lines per file, hard cap 800.

---

## Decisions encoded (per user 2026-04-28)

1. **Prefixes stay** as `al_b2b_*` / `AL_B2B_*`. REST namespace stays as
   `aesthetics-link/v1`. Tables stay as `wp_al_b2b_*`. Plugin name stays.
2. **Refactor in place** — no parallel template directory.
3. **Role names configurable via constants**, defaults match existing
   data: `define('AL_B2B_ROLE_PENDING', 'clinic_pending')` and
   `define('AL_B2B_ROLE_APPROVED', 'wholesale_customer')`. All code paths
   use the constants. Existing data remains compatible.
4. **B2B split** into two modules: `Membership_Approval` (the workflow)
   and `Wholesale_Pricing` (the engine). Independently togglable.
5. **Newsletter** ships Brevo as the built-in driver (toggled), every
   newsletter event also fires `do_action('al_b2b_newsletter_signup', ...)`.
   Two example listener stubs (Mailchimp, Klaviyo) ship but aren't wired.
6. **Cadence**: pause for review after 3a, 3d, 3e. Other sub-phases
   commit through.
7. **Phase 4** (Next.js feature integration) does not start until you
   approve all of Phase 3.

---

## Risk note

This is a 4,827-line refactor with no PHP unit tests. Mitigations:
- Every commit is `php -l` syntax-clean.
- Every commit is behaviour-preserving by construction (move + delegate,
  not rewrite + diff).
- Atomic commits — `git revert` of any single commit returns the plugin
  to a working state.
- I will pause and ask if any extraction looks like it might change
  behaviour, instead of guessing.
