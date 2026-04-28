<?php
/**
 * Default configuration for the AestheticsLink B2B Auth plugin.
 *
 * Returns an associative array of settings consumed by AL_B2B_Plugin and
 * AL_B2B_Modules during boot. Sources, in order of precedence:
 *
 *   1. PHP constants (defined in wp-config.php) — highest priority,
 *      ideal for security-sensitive values like secrets.
 *   2. Saved options from the Settings -> AL B2B admin page (3f).
 *   3. Hard-coded defaults in this file.
 *
 * Plus an `al_b2b_config` filter applied to the final array so other
 * code can mutate it.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

$saved_settings  = AL_B2B_Settings::get();
$saved_modules   = is_array($saved_settings['modules'] ?? null) ? $saved_settings['modules'] : array();
$default_modules = array(
	// Existing functionality (preserves current production behaviour).
	'membership_approval' => true,
	'wholesale_pricing'   => true,
	'newsletter'          => true,
	'marketing_events'    => true,
	'reviews'             => true,
	'checkout_bridge'     => true,
	'order_receipt'       => true,
	// New feature modules (Phase 3 additions).
	'wishlist'            => false,
	'abandoned_cart'      => false,
	'coupons'             => false,
	'real_time_stock'     => false,
	'faceted_search'      => false,
	// Stub modules (integration points only, no logic yet).
	'subscriptions'       => false,
	'multi_currency'      => false,
	'multi_language'      => false,
);

return apply_filters('al_b2b_config', array(

	'modules'           => array_merge($default_modules, $saved_modules),

	'auth_strategy'     => defined('AL_B2B_AUTH_STRATEGY')
		? AL_B2B_AUTH_STRATEGY
		: ($saved_settings['auth_strategy'] ?? 'opaque_session'),

	'roles' => array(
		'pending'  => defined('AL_B2B_ROLE_PENDING')  ? AL_B2B_ROLE_PENDING  : 'clinic_pending',
		'approved' => defined('AL_B2B_ROLE_APPROVED') ? AL_B2B_ROLE_APPROVED : 'wholesale_customer',
	),

	'newsletter_driver' => defined('AL_B2B_NEWSLETTER_DRIVER')
		? AL_B2B_NEWSLETTER_DRIVER
		: ($saved_settings['newsletter_driver'] ?? 'brevo'),

	'frontend_url'      => defined('AL_B2B_FRONTEND_URL')
		? AL_B2B_FRONTEND_URL
		: ($saved_settings['frontend_url'] ?? ''),

	'webhooks' => array(
		'target_url'      => defined('AL_B2B_WEBHOOK_TARGET_URL')
			? AL_B2B_WEBHOOK_TARGET_URL
			: ($saved_settings['webhook_target_url'] ?? ''),
		'secret'          => defined('AL_B2B_WEBHOOK_SECRET')
			? AL_B2B_WEBHOOK_SECRET
			: ($saved_settings['webhook_secret'] ?? ''),
		'max_attempts'    => 3,
		'backoff_seconds' => array(0, 30, 120),
	),

));
