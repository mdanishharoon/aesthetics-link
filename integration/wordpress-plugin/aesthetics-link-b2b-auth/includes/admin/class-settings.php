<?php
/**
 * Settings registry — shape, defaults, sanitization.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Single source of truth for the plugin's configurable settings.
 *
 * Settings are stored in a single option (`AL_B2B_Settings::OPTION_KEY`)
 * to keep the wp_options surface clean. Each top-level key matches the
 * shape consumed by config/default-config.php so a deployer can switch
 * between settings-page-driven and constant-driven configuration without
 * code changes.
 *
 * Constant precedence: when a `wp-config.php` constant is defined for a
 * setting (e.g. AL_B2B_AUTH_STRATEGY, AL_B2B_FRONTEND_URL), it OVERRIDES
 * the saved option. Useful for security-sensitive values (secrets) that
 * should stay outside the DB. The settings UI shows an "Overridden by
 * constant" indicator for each affected field.
 */
class AL_B2B_Settings {

	public const OPTION_KEY      = 'al_b2b_settings';
	public const SETTINGS_GROUP  = 'al_b2b_settings_group';

	/**
	 * Defaults used when no option row exists yet. Mirrors the static side of
	 * config/default-config.php so a fresh install behaves identically to a
	 * blank settings page.
	 */
	public static function defaults(): array {
		return array(
			'frontend_url'       => '',
			'auth_strategy'      => 'opaque_session',
			'jwt_secret'         => '',
			'newsletter_driver'  => 'brevo',
			'webhook_target_url' => '',
			'webhook_secret'     => '',
			'modules'            => self::default_module_flags(),
		);
	}

	public static function default_module_flags(): array {
		return array(
			'membership_approval' => true,
			'wholesale_pricing'   => true,
			'newsletter'          => true,
			'marketing_events'    => true,
			'reviews'             => true,
			'checkout_bridge'     => true,
			'order_receipt'       => true,
			'wishlist'            => false,
			'abandoned_cart'      => false,
			'coupons'             => false,
			'real_time_stock'     => false,
			'faceted_search'      => false,
			'subscriptions'       => false,
			'multi_currency'      => false,
			'multi_language'      => false,
		);
	}

	/**
	 * Read the saved option merged with defaults. Pure - no constant
	 * resolution; that happens in config/default-config.php.
	 */
	public static function get(): array {
		$saved = get_option(self::OPTION_KEY, array());
		if (!is_array($saved)) {
			$saved = array();
		}
		$defaults                 = self::defaults();
		$merged                   = array_merge($defaults, $saved);
		$merged['modules']        = array_merge($defaults['modules'], $saved['modules'] ?? array());
		return $merged;
	}

	/**
	 * Sanitize input from the settings form before WordPress writes it.
	 * Called by register_setting()'s `sanitize_callback`.
	 */
	public static function sanitize(array $input): array {
		$clean = array();

		$clean['frontend_url']       = isset($input['frontend_url'])       ? esc_url_raw(trim((string) $input['frontend_url'])) : '';
		$clean['auth_strategy']      = (isset($input['auth_strategy']) && $input['auth_strategy'] === 'jwt') ? 'jwt' : 'opaque_session';
		$clean['jwt_secret']         = isset($input['jwt_secret'])         ? trim((string) $input['jwt_secret']) : '';
		$clean['newsletter_driver']  = self::sanitize_newsletter_driver($input['newsletter_driver'] ?? 'brevo');
		$clean['webhook_target_url'] = isset($input['webhook_target_url']) ? esc_url_raw(trim((string) $input['webhook_target_url'])) : '';
		$clean['webhook_secret']     = isset($input['webhook_secret'])     ? trim((string) $input['webhook_secret']) : '';

		$module_input  = isset($input['modules']) && is_array($input['modules']) ? $input['modules'] : array();
		$module_flags  = self::default_module_flags();
		foreach (array_keys($module_flags) as $module_id) {
			$module_flags[$module_id] = !empty($module_input[$module_id]);
		}
		$clean['modules'] = $module_flags;

		return $clean;
	}

	/**
	 * For a given setting key, return the constant override if defined or
	 * null. The settings-page UI uses this to show "Overridden by constant"
	 * on fields that wp-config.php has already locked.
	 */
	public static function constant_override(string $key): ?string {
		$map = array(
			'frontend_url'       => 'AL_B2B_FRONTEND_URL',
			'auth_strategy'      => 'AL_B2B_AUTH_STRATEGY',
			'jwt_secret'         => 'AL_B2B_AUTH_JWT_SECRET',
			'newsletter_driver'  => 'AL_B2B_NEWSLETTER_DRIVER',
			'webhook_target_url' => 'AL_B2B_WEBHOOK_TARGET_URL',
			'webhook_secret'     => 'AL_B2B_WEBHOOK_SECRET',
		);
		if (!isset($map[$key])) {
			return null;
		}
		$constant = $map[$key];
		return defined($constant) ? (string) constant($constant) : null;
	}

	private static function sanitize_newsletter_driver(string $value): string {
		$allowed = array('brevo', 'none');
		return in_array($value, $allowed, true) ? $value : 'brevo';
	}
}
