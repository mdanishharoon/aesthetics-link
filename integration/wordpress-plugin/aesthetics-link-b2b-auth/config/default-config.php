<?php
/**
 * Default configuration for the AestheticsLink B2B Auth plugin.
 *
 * Returns an associative array of settings consumed by AL_B2B_Plugin and
 * AL_B2B_Modules during boot. Deployers can override via:
 *   - PHP constants (defined in wp-config.php), see entries below
 *   - The `al_b2b_config` filter, which receives the full array
 *
 * Keep this file logic-light. It exists so a future template extraction can
 * lift a deployment's overrides out of the plugin without scanning the code.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

return apply_filters('al_b2b_config', array(

	/*
	 * Module enable/disable flags.
	 *
	 * Modules that mirror current monolithic behaviour default to TRUE so
	 * the plugin behaves identically on existing deployments. New feature
	 * modules introduced during Phase 3 default to FALSE; deployers opt in.
	 */
	'modules' => array(
		// Existing functionality (preserves current production behaviour).
		'membership_approval'   => true,
		'wholesale_pricing'     => true,
		'newsletter'            => true,
		'marketing_events'      => true,
		'reviews'               => true,
		'checkout_bridge'       => true,
		'order_receipt'         => true,

		// New feature modules (Phase 3 additions).
		'wishlist'              => false,
		'abandoned_cart'        => false,
		'coupons'               => false,
		'real_time_stock'       => false,
		'faceted_search'        => false,

		// Stub modules (integration points only, no logic yet).
		'subscriptions'         => false,
		'multi_currency'        => false,
		'multi_language'        => false,
	),

	/*
	 * Authentication strategy.
	 *
	 *   'opaque_session' — server-issued opaque token, hashed in DB,
	 *                      revocable. Default; matches current behaviour.
	 *   'jwt'           — stateless JSON Web Token. Ships but is opt-in.
	 *
	 * Override via:  define('AL_B2B_AUTH_STRATEGY', 'jwt');
	 */
	'auth_strategy' => defined('AL_B2B_AUTH_STRATEGY') ? AL_B2B_AUTH_STRATEGY : 'opaque_session',

	/*
	 * Role names used by the membership-approval module.
	 *
	 * Defaults preserve existing user-meta and role records. Override via:
	 *   define('AL_B2B_ROLE_PENDING',  'your_pending_role');
	 *   define('AL_B2B_ROLE_APPROVED', 'your_approved_role');
	 */
	'roles' => array(
		'pending'  => defined('AL_B2B_ROLE_PENDING')  ? AL_B2B_ROLE_PENDING  : 'clinic_pending',
		'approved' => defined('AL_B2B_ROLE_APPROVED') ? AL_B2B_ROLE_APPROVED : 'wholesale_customer',
	),

	/*
	 * Newsletter driver selection.
	 *
	 *   'brevo' — Brevo CRM sync (default). Requires AL_B2B_BREVO_API_KEY.
	 *   'none'  — Local subscriber table only, no upstream sync.
	 *
	 * Regardless of driver, every signup also fires
	 * `do_action('al_b2b_newsletter_signup', $email, $meta)` so additional
	 * listeners (Mailchimp, Klaviyo, custom) can subscribe.
	 */
	'newsletter_driver' => defined('AL_B2B_NEWSLETTER_DRIVER') ? AL_B2B_NEWSLETTER_DRIVER : 'brevo',

	/*
	 * Outbound webhook configuration. Used by modules that push events to
	 * the Next.js frontend (e.g. real_time_stock, abandoned_cart).
	 *
	 *   target_url — full URL of the frontend webhook endpoint.
	 *   secret     — HMAC-SHA256 shared secret, must match the frontend.
	 *   max_attempts / backoff_seconds — retry policy via WP-Cron.
	 */
	'webhooks' => array(
		'target_url'      => defined('AL_B2B_WEBHOOK_TARGET_URL') ? AL_B2B_WEBHOOK_TARGET_URL : '',
		'secret'          => defined('AL_B2B_WEBHOOK_SECRET')     ? AL_B2B_WEBHOOK_SECRET     : '',
		'max_attempts'    => 3,
		'backoff_seconds' => array(0, 30, 120),
	),

));
