<?php
/**
 * Plugin Name: AestheticsLink B2B Auth
 * Description: Custom REST auth, clinic approval workflow, and wholesale pricing endpoints for AestheticsLink storefront.
 * Version: 0.3.0
 * Author: AestheticsLink
 */

if (!defined('ABSPATH')) {
	exit;
}

defined('AL_B2B_SESSION_TABLE')              || define('AL_B2B_SESSION_TABLE',              'al_b2b_sessions');
defined('AL_B2B_AUDIT_TABLE')                || define('AL_B2B_AUDIT_TABLE',                'al_b2b_audit_log');
defined('AL_B2B_NEWSLETTER_TABLE')           || define('AL_B2B_NEWSLETTER_TABLE',           'al_b2b_newsletter_subscribers');
defined('AL_B2B_MARKETING_EVENT_TABLE')      || define('AL_B2B_MARKETING_EVENT_TABLE',      'al_b2b_marketing_events');
defined('AL_B2B_CLEANUP_EVENT')              || define('AL_B2B_CLEANUP_EVENT',              'al_b2b_cleanup_sessions_event');
defined('AL_B2B_INACTIVE_EVENT')             || define('AL_B2B_INACTIVE_EVENT',             'al_b2b_mark_inactive_contacts_event');

defined('AL_B2B_ACCOUNT_TYPE_META')          || define('AL_B2B_ACCOUNT_TYPE_META',          'al_account_type');
defined('AL_B2B_CLINIC_STATUS_META')         || define('AL_B2B_CLINIC_STATUS_META',         'al_clinic_status');
defined('AL_B2B_BUSINESS_INFO_META')         || define('AL_B2B_BUSINESS_INFO_META',         'al_business_info');
defined('AL_B2B_EMAIL_VERIFIED_META')        || define('AL_B2B_EMAIL_VERIFIED_META',        'al_email_verified');
defined('AL_B2B_EMAIL_VERIFY_HASH_META')     || define('AL_B2B_EMAIL_VERIFY_HASH_META',     'al_email_verification_hash');
defined('AL_B2B_EMAIL_VERIFY_EXPIRES_META')  || define('AL_B2B_EMAIL_VERIFY_EXPIRES_META',  'al_email_verification_expires');
defined('AL_B2B_PASSWORD_RESET_HASH_META')   || define('AL_B2B_PASSWORD_RESET_HASH_META',   'al_password_reset_hash');
defined('AL_B2B_PASSWORD_RESET_EXPIRES_META') || define('AL_B2B_PASSWORD_RESET_EXPIRES_META', 'al_password_reset_expires');
defined('AL_B2B_WHOLESALE_PRICE_META')       || define('AL_B2B_WHOLESALE_PRICE_META',       '_al_b2b_wholesale_price');
defined('AL_B2B_WHOLESALE_PERCENT_META')     || define('AL_B2B_WHOLESALE_PERCENT_META',     '_al_b2b_wholesale_discount_percent');
defined('AL_B2B_WHOLESALE_TERM_PERCENT_META') || define('AL_B2B_WHOLESALE_TERM_PERCENT_META', 'al_b2b_wholesale_discount_percent');

defined('AL_B2B_ADMIN_NONCE_ACTION')         || define('AL_B2B_ADMIN_NONCE_ACTION',         'al_b2b_clinic_decision');
defined('AL_B2B_VERIFY_TTL')                 || define('AL_B2B_VERIFY_TTL',                 2 * DAY_IN_SECONDS);
defined('AL_B2B_RESET_TTL')                  || define('AL_B2B_RESET_TTL',                  HOUR_IN_SECONDS);
defined('AL_B2B_SESSION_TTL')                || define('AL_B2B_SESSION_TTL',                30 * DAY_IN_SECONDS);

/*
 * Load OOP scaffolding. The procedural code below still owns most hook
 * registrations; sub-phases progressively migrate functionality into the
 * orchestrator. As of Phase 3b the auth strategy is class-driven and the
 * remaining global auth functions are thin delegates.
 */
require_once __DIR__ . '/includes/interface-module.php';
require_once __DIR__ . '/includes/interface-auth-strategy.php';
require_once __DIR__ . '/includes/class-loader.php';
require_once __DIR__ . '/includes/class-modules.php';
require_once __DIR__ . '/includes/auth/class-opaque-session-strategy.php';
require_once __DIR__ . '/includes/auth/class-jwt-strategy.php';
require_once __DIR__ . '/includes/api/class-base-rest-controller.php';
require_once __DIR__ . '/includes/api/class-auth-controller.php';
require_once __DIR__ . '/includes/services/class-webhook-dispatcher.php';
require_once __DIR__ . '/includes/class-plugin.php';

AL_B2B_Plugin::instance()->boot();

register_activation_hook(__FILE__, 'al_b2b_activate');
register_deactivation_hook(__FILE__, 'al_b2b_deactivate');

add_action('admin_menu', 'al_b2b_register_admin_menu');
add_action('admin_init', 'al_b2b_handle_admin_actions');
add_action('rest_api_init', 'al_b2b_register_routes');
add_action(AL_B2B_CLEANUP_EVENT, 'al_b2b_cleanup_expired_sessions');
add_action(AL_B2B_INACTIVE_EVENT, 'al_b2b_mark_inactive_contacts');
add_filter('allowed_redirect_hosts', 'al_b2b_allow_frontend_redirect_host');
add_filter('woocommerce_get_return_url', 'al_b2b_override_return_url', 10, 2);
add_filter('determine_current_user', 'al_b2b_determine_current_user_for_store_api', 25);
add_filter('woocommerce_product_get_price', 'al_b2b_filter_wholesale_price', 99, 2);
add_filter('woocommerce_product_get_regular_price', 'al_b2b_filter_wholesale_regular_price', 99, 2);
add_filter('woocommerce_product_get_sale_price', 'al_b2b_filter_wholesale_sale_price', 99, 2);
add_filter('woocommerce_product_variation_get_price', 'al_b2b_filter_wholesale_price', 99, 2);
add_filter('woocommerce_product_variation_get_regular_price', 'al_b2b_filter_wholesale_regular_price', 99, 2);
add_filter('woocommerce_product_variation_get_sale_price', 'al_b2b_filter_wholesale_sale_price', 99, 2);
add_action('woocommerce_product_options_pricing', 'al_b2b_render_product_wholesale_fields');
add_action('woocommerce_process_product_meta', 'al_b2b_save_product_wholesale_fields');
add_action('woocommerce_variation_options_pricing', 'al_b2b_render_variation_wholesale_fields', 10, 3);
add_action('woocommerce_save_product_variation', 'al_b2b_save_variation_wholesale_fields', 10, 2);
add_action('product_cat_add_form_fields', 'al_b2b_render_product_cat_wholesale_add_fields');
add_action('product_cat_edit_form_fields', 'al_b2b_render_product_cat_wholesale_edit_fields', 10, 1);
add_action('created_product_cat', 'al_b2b_save_product_cat_wholesale_fields', 10, 1);
add_action('edited_product_cat', 'al_b2b_save_product_cat_wholesale_fields', 10, 1);
add_filter('woocommerce_defer_transactional_emails', '__return_true');
add_action('template_redirect', 'al_b2b_lock_checkout_subdomain', 1);


function al_b2b_activate() {
	al_b2b_ensure_roles();
	al_b2b_create_tables();

	if (!wp_next_scheduled(AL_B2B_CLEANUP_EVENT)) {
		wp_schedule_event(time() + HOUR_IN_SECONDS, 'hourly', AL_B2B_CLEANUP_EVENT);
	}

	if (!wp_next_scheduled(AL_B2B_INACTIVE_EVENT)) {
		wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', AL_B2B_INACTIVE_EVENT);
	}
}

function al_b2b_deactivate() {
	$timestamp = wp_next_scheduled(AL_B2B_CLEANUP_EVENT);
	if ($timestamp) {
		wp_unschedule_event($timestamp, AL_B2B_CLEANUP_EVENT);
	}

	$inactive_timestamp = wp_next_scheduled(AL_B2B_INACTIVE_EVENT);
	if ($inactive_timestamp) {
		wp_unschedule_event($inactive_timestamp, AL_B2B_INACTIVE_EVENT);
	}
}

function al_b2b_ensure_roles() {
	if (!get_role('clinic_pending')) {
		add_role('clinic_pending', 'Clinic Pending', array('read' => true));
	}

	if (!get_role('wholesale_customer')) {
		add_role('wholesale_customer', 'Wholesale Customer', array('read' => true));
	}
}

function al_b2b_get_sessions_table_name() {
	global $wpdb;
	return $wpdb->prefix . AL_B2B_SESSION_TABLE;
}

function al_b2b_get_audit_table_name() {
	global $wpdb;
	return $wpdb->prefix . AL_B2B_AUDIT_TABLE;
}

function al_b2b_get_newsletter_table_name() {
	global $wpdb;
	return $wpdb->prefix . AL_B2B_NEWSLETTER_TABLE;
}

function al_b2b_get_marketing_event_table_name() {
	global $wpdb;
	return $wpdb->prefix . AL_B2B_MARKETING_EVENT_TABLE;
}

function al_b2b_create_tables() {
	global $wpdb;

	$charset_collate = $wpdb->get_charset_collate();
	$sessions_table = al_b2b_get_sessions_table_name();
	$audit_table = al_b2b_get_audit_table_name();
	$newsletter_table = al_b2b_get_newsletter_table_name();
	$events_table = al_b2b_get_marketing_event_table_name();

	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$sql_sessions = "CREATE TABLE {$sessions_table} (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
		token_hash CHAR(64) NOT NULL,
		user_id BIGINT UNSIGNED NOT NULL,
		expires_at DATETIME NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (id),
		UNIQUE KEY token_hash (token_hash),
		KEY user_id (user_id),
		KEY expires_at (expires_at)
	) {$charset_collate};";

	$sql_audit = "CREATE TABLE {$audit_table} (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
		action VARCHAR(64) NOT NULL,
		target_user_id BIGINT UNSIGNED NOT NULL,
		actor_user_id BIGINT UNSIGNED NOT NULL,
		ip_address VARCHAR(64) NOT NULL DEFAULT '',
		details LONGTEXT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (id),
		KEY action (action),
		KEY target_user_id (target_user_id),
		KEY created_at (created_at)
	) {$charset_collate};";

	$sql_newsletter = "CREATE TABLE {$newsletter_table} (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
		email VARCHAR(190) NOT NULL,
		source VARCHAR(64) NOT NULL DEFAULT 'footer',
		customer_type VARCHAR(32) NOT NULL DEFAULT '',
		region VARCHAR(16) NOT NULL DEFAULT '',
		status VARCHAR(32) NOT NULL DEFAULT 'subscribed',
		subscribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		last_event_at DATETIME NULL,
		attributes LONGTEXT NULL,
		ip_address VARCHAR(64) NOT NULL DEFAULT '',
		user_agent VARCHAR(255) NOT NULL DEFAULT '',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		PRIMARY KEY (id),
		UNIQUE KEY email (email),
		KEY subscribed_at (subscribed_at),
		KEY status (status)
	) {$charset_collate};";

	$sql_events = "CREATE TABLE {$events_table} (
		id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
		event_name VARCHAR(64) NOT NULL,
		email VARCHAR(190) NOT NULL DEFAULT '',
		user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
		source VARCHAR(64) NOT NULL DEFAULT '',
		customer_type VARCHAR(32) NOT NULL DEFAULT '',
		region VARCHAR(16) NOT NULL DEFAULT '',
		payload LONGTEXT NULL,
		occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		ip_address VARCHAR(64) NOT NULL DEFAULT '',
		user_agent VARCHAR(255) NOT NULL DEFAULT '',
		PRIMARY KEY (id),
		KEY event_name (event_name),
		KEY email (email),
		KEY user_id (user_id),
		KEY occurred_at (occurred_at)
	) {$charset_collate};";

	dbDelta($sql_sessions);
	dbDelta($sql_audit);
	dbDelta($sql_newsletter);
	dbDelta($sql_events);
}

function al_b2b_cleanup_expired_sessions() {
	AL_B2B_Plugin::instance()->get_auth_strategy()->cleanup_expired();
}

function al_b2b_get_request_ip() {
	$headers = array(
		'HTTP_CF_CONNECTING_IP',
		'HTTP_X_FORWARDED_FOR',
		'HTTP_X_REAL_IP',
		'REMOTE_ADDR',
	);

	foreach ($headers as $key) {
		if (!isset($_SERVER[$key])) {
			continue;
		}

		$raw = wp_unslash($_SERVER[$key]);
		if (!$raw) {
			continue;
		}

		$parts = explode(',', $raw);
		$ip = trim($parts[0]);
		if ($ip && filter_var($ip, FILTER_VALIDATE_IP)) {
			return $ip;
		}
	}

	return '';
}

function al_b2b_get_request_user_agent() {
	$raw = isset($_SERVER['HTTP_USER_AGENT']) ? (string) wp_unslash($_SERVER['HTTP_USER_AGENT']) : '';
	$raw = trim($raw);

	if ($raw === '') {
		return '';
	}

	$normalized = preg_replace('/\s+/', ' ', $raw);
	$normalized = is_string($normalized) ? trim($normalized) : $raw;

	return substr($normalized, 0, 255);
}

function al_b2b_guard_rate_limit($scope, $max_attempts, $window_seconds) {
	$ip = al_b2b_get_request_ip();
	$key = 'al_b2b_rl_' . md5($scope . '|' . $ip);
	$current = get_transient($key);

	if (!is_array($current)) {
		$current = array(
			'count' => 0,
		);
	}

	$current['count'] = isset($current['count']) ? (int) $current['count'] : 0;

	if ($current['count'] >= $max_attempts) {
		return new WP_Error(
			'rate_limited',
			'Too many attempts. Please wait and try again.',
			array('status' => 429)
		);
	}

	$current['count']++;
	set_transient($key, $current, $window_seconds);

	return true;
}

function al_b2b_get_turnstile_secret() {
	if (defined('AL_B2B_TURNSTILE_SECRET') && AL_B2B_TURNSTILE_SECRET) {
		return trim((string) AL_B2B_TURNSTILE_SECRET);
	}

	return '';
}

function al_b2b_get_checkout_bridge_secret() {
	if (defined('AL_B2B_CHECKOUT_BRIDGE_SECRET') && AL_B2B_CHECKOUT_BRIDGE_SECRET) {
		return trim((string) AL_B2B_CHECKOUT_BRIDGE_SECRET);
	}

	return '';
}

function al_b2b_get_brevo_api_key() {
	if (defined('AL_B2B_BREVO_API_KEY') && AL_B2B_BREVO_API_KEY) {
		return trim((string) AL_B2B_BREVO_API_KEY);
	}

	return '';
}

function al_b2b_get_brevo_list_id() {
	if (defined('AL_B2B_BREVO_LIST_ID') && AL_B2B_BREVO_LIST_ID) {
		$list_id = (int) AL_B2B_BREVO_LIST_ID;
		return $list_id > 0 ? $list_id : 0;
	}

	return 0;
}

function al_b2b_get_brevo_webhook_secret() {
	if (defined('AL_B2B_BREVO_WEBHOOK_SECRET') && AL_B2B_BREVO_WEBHOOK_SECRET) {
		return trim((string) AL_B2B_BREVO_WEBHOOK_SECRET);
	}

	return '';
}

function al_b2b_base64url_encode($value) {
	$encoded = base64_encode((string) $value);
	$encoded = strtr($encoded, '+/', '-_');

	return rtrim($encoded, '=');
}

function al_b2b_base64url_decode($value) {
	$value = strtr((string) $value, '-_', '+/');
	$padding = strlen($value) % 4;
	if ($padding > 0) {
		$value .= str_repeat('=', 4 - $padding);
	}

	$decoded = base64_decode($value, true);
	if ($decoded === false) {
		return null;
	}

	return $decoded;
}

function al_b2b_parse_checkout_bridge_payload($encoded_payload, $signature) {
	$encoded_payload = trim((string) $encoded_payload);
	$signature = trim((string) $signature);
	$secret = al_b2b_get_checkout_bridge_secret();

	if (!$encoded_payload || !$signature || !$secret) {
		return null;
	}

	$expected_signature = al_b2b_base64url_encode(
		hash_hmac('sha256', $encoded_payload, $secret, true)
	);

	if (!hash_equals($expected_signature, $signature)) {
		return null;
	}

	$json = al_b2b_base64url_decode($encoded_payload);
	if (!$json) {
		return null;
	}

	$payload = json_decode($json, true);
	if (!is_array($payload)) {
		return null;
	}

	$exp = isset($payload['exp']) ? (int) $payload['exp'] : 0;
	$cart_token = isset($payload['cartToken']) ? trim((string) $payload['cartToken']) : '';
	$user_id = isset($payload['userId']) ? (int) $payload['userId'] : 0;

	if ($exp <= 0 || $exp < time()) {
		return null;
	}

	if (!$cart_token || strlen($cart_token) > 512) {
		return null;
	}

	return array(
		'cartToken' => $cart_token,
		'userId' => $user_id > 0 ? $user_id : 0,
	);
}

function al_b2b_get_order_receipt_ttl() {
	$ttl = (int) apply_filters('al_b2b_order_receipt_ttl', 2 * DAY_IN_SECONDS);
	return max(HOUR_IN_SECONDS, $ttl);
}

function al_b2b_sign_order_receipt_payload($encoded_payload) {
	$secret = al_b2b_get_checkout_bridge_secret();
	if (!$secret || !$encoded_payload) {
		return '';
	}

	return al_b2b_base64url_encode(
		hash_hmac('sha256', 'order_receipt|' . $encoded_payload, $secret, true)
	);
}

function al_b2b_create_order_receipt_token($order) {
	if (!$order || !method_exists($order, 'get_id') || !method_exists($order, 'get_order_key')) {
		return '';
	}

	$order_id = (int) $order->get_id();
	$order_key = trim((string) $order->get_order_key());

	if ($order_id <= 0 || !$order_key) {
		return '';
	}

	$payload = array(
		'orderId' => $order_id,
		'key' => $order_key,
		'exp' => time() + al_b2b_get_order_receipt_ttl(),
	);

	$encoded_payload = al_b2b_base64url_encode(wp_json_encode($payload));
	$signature = al_b2b_sign_order_receipt_payload($encoded_payload);

	if (!$encoded_payload || !$signature) {
		return '';
	}

	return $encoded_payload . '.' . $signature;
}

function al_b2b_parse_order_receipt_token($token) {
	$token = trim((string) $token);
	if (!$token) {
		return null;
	}

	$parts = explode('.', $token);
	if (count($parts) !== 2) {
		return null;
	}

	$encoded_payload = trim((string) $parts[0]);
	$signature = trim((string) $parts[1]);
	$expected_signature = al_b2b_sign_order_receipt_payload($encoded_payload);

	if (!$expected_signature || !$signature || !hash_equals($expected_signature, $signature)) {
		return null;
	}

	$json = al_b2b_base64url_decode($encoded_payload);
	if (!$json) {
		return null;
	}

	$payload = json_decode($json, true);
	if (!is_array($payload)) {
		return null;
	}

	$order_id = isset($payload['orderId']) ? (int) $payload['orderId'] : 0;
	$order_key = isset($payload['key']) ? trim((string) $payload['key']) : '';
	$exp = isset($payload['exp']) ? (int) $payload['exp'] : 0;

	if ($order_id <= 0 || !$order_key || $exp <= time()) {
		return null;
	}

	return array(
		'orderId' => $order_id,
		'key' => $order_key,
	);
}

function al_b2b_assert_captcha($payload) {
	$secret = al_b2b_get_turnstile_secret();
	if (!$secret) {
		return true;
	}

	$token = isset($payload['captchaToken']) ? sanitize_text_field((string) $payload['captchaToken']) : '';
	if (!$token) {
		return new WP_Error('captcha_required', 'Captcha is required.', array('status' => 400));
	}

	$response = wp_remote_post(
		'https://challenges.cloudflare.com/turnstile/v0/siteverify',
		array(
			'timeout' => 10,
			'body' => array(
				'secret' => $secret,
				'response' => $token,
				'remoteip' => al_b2b_get_request_ip(),
			),
		)
	);

	if (is_wp_error($response)) {
		return new WP_Error('captcha_failed', 'Captcha verification failed.', array('status' => 400));
	}

	$body = wp_remote_retrieve_body($response);
	$data = json_decode($body, true);
	$success = is_array($data) && !empty($data['success']);

	if (!$success) {
		return new WP_Error('captcha_failed', 'Captcha verification failed.', array('status' => 400));
	}

	return true;
}

function al_b2b_normalize_frontend_url($raw_url) {
	$url = trim((string) $raw_url);
	if ($url === '') {
		return '';
	}

	// Guard against common typo observed in production config values.
	if (stripos($url, 'htthttps://') === 0) {
		$url = 'https://' . substr($url, strlen('htthttps://'));
	}

	$parsed = wp_parse_url($url);
	if (!is_array($parsed) || empty($parsed['host'])) {
		return '';
	}

	$scheme = isset($parsed['scheme']) ? strtolower((string) $parsed['scheme']) : '';
	if ($scheme !== 'http' && $scheme !== 'https') {
		return '';
	}

	$normalized = $scheme . '://' . $parsed['host'];
	if (!empty($parsed['port'])) {
		$normalized .= ':' . (int) $parsed['port'];
	}
	if (!empty($parsed['path'])) {
		$normalized .= '/' . ltrim((string) $parsed['path'], '/');
	}

	return untrailingslashit($normalized);
}

function al_b2b_get_frontend_base_url() {
	// Dev override is now guarded to prevent localhost redirects on production:
	// it only activates when BOTH conditions are true:
	// 1) AL_B2B_ENABLE_DEV_FRONTEND_OVERRIDE === true
	// 2) wp_get_environment_type() is "local" or "development"
	$allow_dev_override = defined('AL_B2B_ENABLE_DEV_FRONTEND_OVERRIDE')
		? (bool) AL_B2B_ENABLE_DEV_FRONTEND_OVERRIDE
		: false;
	$wp_environment = function_exists('wp_get_environment_type')
		? (string) wp_get_environment_type()
		: '';
	$is_dev_environment = in_array($wp_environment, array('local', 'development'), true);

	if (
		$allow_dev_override &&
		$is_dev_environment &&
		defined('AL_B2B_DEV_FRONTEND_URL') &&
		trim((string) AL_B2B_DEV_FRONTEND_URL)
	) {
		$dev = al_b2b_normalize_frontend_url(trim((string) AL_B2B_DEV_FRONTEND_URL));
		if ($dev) {
			return $dev;
		}
	}

	$defined = defined('AL_B2B_FRONTEND_URL') ? trim((string) AL_B2B_FRONTEND_URL) : '';
	$base = $defined ? $defined : home_url('/');
	$filtered = apply_filters('al_b2b_frontend_base_url', $base);
	$normalized = al_b2b_normalize_frontend_url($filtered);

	// If an explicit frontend URL was configured but invalid, fail closed so we do not
	// redirect users to malformed protocols like "htthttps://...".
	if (!$normalized && $defined !== '') {
		return '';
	}

	return $normalized;
}

function al_b2b_allow_frontend_redirect_host(array $hosts): array {
	$frontend_url = al_b2b_get_frontend_base_url();
	if ($frontend_url) {
		$parsed = wp_parse_url($frontend_url);
		if (!empty($parsed['host'])) {
			$hosts[] = $parsed['host'];
		}
	}
	return $hosts;
}

function al_b2b_build_frontend_url($path, $query = array()) {
	$base = al_b2b_get_frontend_base_url();
	$url = $base . '/' . ltrim((string) $path, '/');

	if (!empty($query)) {
		$url = add_query_arg($query, $url);
	}

	return $url;
}

function al_b2b_override_return_url($return_url, $order) {
	if (!$order) {
		return al_b2b_build_frontend_url('/');
	}

	$receipt_token = al_b2b_create_order_receipt_token($order);
	if (!$receipt_token) {
		return al_b2b_build_frontend_url('/');
	}

	return al_b2b_build_frontend_url('api/checkout/complete', array(
		'receipt' => $receipt_token,
	));
}

function al_b2b_lock_checkout_subdomain() {
	global $pagenow;

	// Allow REST API, admin, cron, and login page.
	if (
		(defined('REST_REQUEST') && REST_REQUEST) ||
		(defined('DOING_CRON') && DOING_CRON) ||
		is_admin() ||
		$pagenow === 'wp-login.php'
	) {
		return;
	}

	// Allow WooCommerce gateway callbacks (e.g. ?wc-api=...).
	$wc_api = isset($_GET['wc-api']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		? sanitize_key((string) wp_unslash($_GET['wc-api'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		: '';
	if ($wc_api !== '') {
		return;
	}

	// Allow WooCommerce checkout and all its endpoints (order-received, payment, etc.).
	if (function_exists('is_checkout') && is_checkout()) {
		return;
	}

	// Allow payment gateway callback pages that WooCommerce marks as checkout.
	if (function_exists('is_wc_endpoint_url') && is_wc_endpoint_url()) {
		return;
	}

	// Redirect everything else (home, shop, product pages, etc.) to the frontend.
	$frontend_url = al_b2b_get_frontend_base_url();
	if ($frontend_url) {
		wp_redirect($frontend_url, 302);
		exit;
	}
}

function al_b2b_hash_token($purpose, $token) {
	return hash_hmac('sha256', $purpose . '|' . $token, wp_salt('auth'));
}

function al_b2b_create_user_token($user_id, $purpose, $hash_meta_key, $expires_meta_key, $ttl_seconds) {
	$user_id = (int) $user_id;
	if ($user_id <= 0) {
		return null;
	}

	try {
		$random = bin2hex(random_bytes(24));
	} catch (Exception $exception) {
		$random = wp_generate_password(48, false, false);
	}

	$token = $user_id . '.' . $random;
	$hash = al_b2b_hash_token($purpose, $token);

	update_user_meta($user_id, $hash_meta_key, $hash);
	update_user_meta($user_id, $expires_meta_key, time() + (int) $ttl_seconds);

	return $token;
}

function al_b2b_parse_user_id_from_token($token) {
	if (!is_string($token) || strpos($token, '.') === false) {
		return 0;
	}

	$parts = explode('.', $token, 2);
	$user_id = isset($parts[0]) ? (int) $parts[0] : 0;

	return $user_id > 0 ? $user_id : 0;
}

function al_b2b_get_user_from_one_time_token($token, $purpose, $hash_meta_key, $expires_meta_key) {
	$user_id = al_b2b_parse_user_id_from_token($token);
	if ($user_id <= 0) {
		return null;
	}

	$user = get_user_by('id', $user_id);
	if (!$user) {
		return null;
	}

	$expires_at = (int) get_user_meta($user_id, $expires_meta_key, true);
	if ($expires_at <= 0 || $expires_at < time()) {
		return null;
	}

	$stored_hash = (string) get_user_meta($user_id, $hash_meta_key, true);
	$provided_hash = al_b2b_hash_token($purpose, $token);

	if (!$stored_hash || !hash_equals($stored_hash, $provided_hash)) {
		return null;
	}

	return $user;
}

function al_b2b_clear_one_time_token($user_id, $hash_meta_key, $expires_meta_key) {
	$user_id = (int) $user_id;
	if ($user_id <= 0) {
		return;
	}

	delete_user_meta($user_id, $hash_meta_key);
	delete_user_meta($user_id, $expires_meta_key);
}

function al_b2b_is_email_verified($user_id) {
	return (bool) get_user_meta((int) $user_id, AL_B2B_EMAIL_VERIFIED_META, true);
}

function al_b2b_send_verification_email($user) {
	if (!$user || !isset($user->ID)) {
		return false;
	}

	$token = al_b2b_create_user_token(
		$user->ID,
		'email_verify',
		AL_B2B_EMAIL_VERIFY_HASH_META,
		AL_B2B_EMAIL_VERIFY_EXPIRES_META,
		AL_B2B_VERIFY_TTL
	);

	if (!$token) {
		return false;
	}

	$url = al_b2b_build_frontend_url('verify-email', array('token' => $token));
	$site_name = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
	$subject = sprintf('[%s] Verify your email', $site_name);

	$message = "Hi {$user->display_name},\n\n";
	$message .= "Please verify your email to activate your account:\n\n";
	$message .= $url . "\n\n";
	$message .= "This link expires in 48 hours.\n";

	return (bool) wp_mail($user->user_email, $subject, $message);
}

function al_b2b_send_password_reset_email($user) {
	if (!$user || !isset($user->ID)) {
		return false;
	}

	$token = al_b2b_create_user_token(
		$user->ID,
		'password_reset',
		AL_B2B_PASSWORD_RESET_HASH_META,
		AL_B2B_PASSWORD_RESET_EXPIRES_META,
		AL_B2B_RESET_TTL
	);

	if (!$token) {
		return false;
	}

	$url = al_b2b_build_frontend_url('reset-password', array('token' => $token));
	$site_name = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);
	$subject = sprintf('[%s] Reset your password', $site_name);

	$message = "Hi {$user->display_name},\n\n";
	$message .= "Use the link below to reset your password:\n\n";
	$message .= $url . "\n\n";
	$message .= "This link expires in 1 hour.\n";

	return (bool) wp_mail($user->user_email, $subject, $message);
}

function al_b2b_get_json_body($request) {
	$params = $request->get_json_params();
	return is_array($params) ? $params : array();
}

function al_b2b_normalize_account_type($value) {
	return $value === 'clinic' ? 'clinic' : 'retail';
}

function al_b2b_derive_username_from_email($email) {
	$parts = explode('@', $email);
	$base = sanitize_user($parts[0], true);
	$base = $base ? $base : 'user';
	$username = $base;
	$counter = 2;

	while (username_exists($username)) {
		$username = $base . $counter;
		$counter++;
	}

	return $username;
}

function al_b2b_get_business_info_from_payload($payload) {
	$business = isset($payload['businessInfo']) && is_array($payload['businessInfo']) ? $payload['businessInfo'] : array();

	return array(
		'clinicName' => isset($business['clinicName']) ? sanitize_text_field($business['clinicName']) : '',
		'businessName' => isset($business['businessName']) ? sanitize_text_field($business['businessName']) : '',
		'licenseNumber' => isset($business['licenseNumber']) ? sanitize_text_field($business['licenseNumber']) : '',
		'taxId' => isset($business['taxId']) ? sanitize_text_field($business['taxId']) : '',
		'website' => isset($business['website']) ? esc_url_raw($business['website']) : '',
		'phone' => isset($business['phone']) ? sanitize_text_field($business['phone']) : '',
	);
}

function al_b2b_get_authorization_header_value() {
	$keys = array(
		'HTTP_AUTHORIZATION',
		'REDIRECT_HTTP_AUTHORIZATION',
	);

	foreach ($keys as $key) {
		if (!empty($_SERVER[$key])) {
			return trim((string) wp_unslash($_SERVER[$key]));
		}
	}

	if (function_exists('apache_request_headers')) {
		$headers = apache_request_headers();
		if (is_array($headers)) {
			foreach ($headers as $header_key => $header_value) {
				if (strcasecmp((string) $header_key, 'Authorization') === 0) {
					return trim((string) $header_value);
				}
			}
		}
	}

	return '';
}

function al_b2b_parse_bearer_token_from_header($header_value) {
	return AL_B2B_Base_REST_Controller::extract_bearer_from_header((string) $header_value);
}

function al_b2b_request_targets_store_api() {
	$request_uri = isset($_SERVER['REQUEST_URI']) ? trim((string) wp_unslash($_SERVER['REQUEST_URI'])) : '';
	if (!$request_uri) {
		return false;
	}

	return strpos($request_uri, '/wp-json/wc/store/') !== false;
}

function al_b2b_determine_current_user_for_store_api($current_user_id) {
	$current_user_id = (int) $current_user_id;
	if ($current_user_id > 0) {
		return $current_user_id;
	}

	if (!(defined('REST_REQUEST') && REST_REQUEST)) {
		return $current_user_id;
	}

	if (!al_b2b_request_targets_store_api()) {
		return $current_user_id;
	}

	$token = al_b2b_parse_bearer_token_from_header(al_b2b_get_authorization_header_value());
	if ($token === '') {
		return $current_user_id;
	}

	$resolved = AL_B2B_Plugin::instance()->get_auth_strategy()->resolve_user_id_from_token($token);
	return $resolved > 0 ? $resolved : $current_user_id;
}

function al_b2b_parse_decimal($value) {
	if ($value === null) {
		return null;
	}

	$value = trim((string) $value);
	if ($value === '') {
		return null;
	}

	$normalized = str_replace(',', '.', $value);
	if (!is_numeric($normalized)) {
		return null;
	}

	return (float) $normalized;
}

function al_b2b_format_decimal_for_storage($value) {
	if (!function_exists('wc_format_decimal') || !function_exists('wc_get_price_decimals')) {
		return (string) $value;
	}

	return wc_format_decimal((float) $value, wc_get_price_decimals(), false);
}

function al_b2b_get_post_meta_decimal($post_id, $meta_key) {
	$post_id = (int) $post_id;
	$meta_key = (string) $meta_key;

	if ($post_id <= 0 || !$meta_key) {
		return null;
	}

	$value = get_post_meta($post_id, $meta_key, true);
	return al_b2b_parse_decimal($value);
}

function al_b2b_get_term_meta_decimal($term_id, $meta_key) {
	$term_id = (int) $term_id;
	$meta_key = (string) $meta_key;
	if ($term_id <= 0 || !$meta_key) {
		return null;
	}

	$value = get_term_meta($term_id, $meta_key, true);
	return al_b2b_parse_decimal($value);
}

function al_b2b_get_global_wholesale_discount_percent() {
	$defined = defined('AL_B2B_DEFAULT_WHOLESALE_DISCOUNT_PERCENT')
		? al_b2b_parse_decimal(AL_B2B_DEFAULT_WHOLESALE_DISCOUNT_PERCENT)
		: null;

	$from_option = al_b2b_parse_decimal(get_option('al_b2b_default_wholesale_discount_percent', ''));
	$value = $defined !== null ? $defined : $from_option;

	if ($value === null) {
		return null;
	}

	$value = max(0.0, min(100.0, $value));
	return $value;
}

function al_b2b_get_max_category_discount_percent($product_id) {
	$product_id = (int) $product_id;
	if ($product_id <= 0) {
		return null;
	}

	static $cache = array();
	if (array_key_exists($product_id, $cache)) {
		return $cache[$product_id];
	}

	$terms = get_the_terms($product_id, 'product_cat');
	if (!is_array($terms) || empty($terms)) {
		$cache[$product_id] = null;
		return null;
	}

	$max_percent = null;
	foreach ($terms as $term) {
		if (!isset($term->term_id)) {
			continue;
		}

		$percent = al_b2b_get_term_meta_decimal((int) $term->term_id, AL_B2B_WHOLESALE_TERM_PERCENT_META);
		if ($percent === null) {
			continue;
		}

		$percent = max(0.0, min(100.0, $percent));
		if ($max_percent === null || $percent > $max_percent) {
			$max_percent = $percent;
		}
	}

	$cache[$product_id] = $max_percent;
	return $max_percent;
}

function al_b2b_get_wholesale_rule_from_post($post_id, $scope) {
	$post_id = (int) $post_id;
	$scope = sanitize_key((string) $scope);
	if ($post_id <= 0) {
		return null;
	}

	$fixed = al_b2b_get_post_meta_decimal($post_id, AL_B2B_WHOLESALE_PRICE_META);
	if ($fixed !== null) {
		return array(
			'type' => 'fixed_price',
			'value' => max(0.0, $fixed),
			'scope' => $scope,
			'id' => $post_id,
		);
	}

	$percent = al_b2b_get_post_meta_decimal($post_id, AL_B2B_WHOLESALE_PERCENT_META);
	if ($percent !== null) {
		return array(
			'type' => 'percent',
			'value' => max(0.0, min(100.0, $percent)),
			'scope' => $scope,
			'id' => $post_id,
		);
	}

	return null;
}

function al_b2b_get_wholesale_rule_for_product($product) {
	if (!$product || !is_a($product, 'WC_Product')) {
		return null;
	}

	$product_id = (int) $product->get_id();
	if ($product_id <= 0) {
		return null;
	}

	static $cache = array();
	if (array_key_exists($product_id, $cache)) {
		return $cache[$product_id];
	}

	$parent_id = $product_id;

	if (method_exists($product, 'is_type') && $product->is_type('variation')) {
		$variation_rule = al_b2b_get_wholesale_rule_from_post($product_id, 'variation');
		if ($variation_rule) {
			$cache[$product_id] = $variation_rule;
			return $variation_rule;
		}

		$parent_id = (int) $product->get_parent_id();
	}

	if ($parent_id > 0) {
		$product_rule = al_b2b_get_wholesale_rule_from_post($parent_id, 'product');
		if ($product_rule) {
			$cache[$product_id] = $product_rule;
			return $product_rule;
		}

		$category_percent = al_b2b_get_max_category_discount_percent($parent_id);
		if ($category_percent !== null) {
			$rule = array(
				'type' => 'percent',
				'value' => $category_percent,
				'scope' => 'category',
				'id' => $parent_id,
			);
			$cache[$product_id] = $rule;
			return $rule;
		}
	}

	$global_percent = al_b2b_get_global_wholesale_discount_percent();
	if ($global_percent !== null) {
		$rule = array(
			'type' => 'percent',
			'value' => $global_percent,
			'scope' => 'global',
			'id' => 0,
		);
		$cache[$product_id] = $rule;
		return $rule;
	}

	$cache[$product_id] = null;
	return null;
}

function al_b2b_get_product_base_price_data($product) {
	if (!$product || !is_a($product, 'WC_Product')) {
		return null;
	}

	$regular = method_exists($product, 'get_regular_price')
		? al_b2b_normalize_price_number($product->get_regular_price('edit'))
		: null;
	$current = method_exists($product, 'get_price')
		? al_b2b_normalize_price_number($product->get_price('edit'))
		: null;

	if ($regular === null && $current === null) {
		return null;
	}

	if ($regular === null) {
		$regular = $current;
	}

	if ($current === null) {
		$current = $regular;
	}

	return array(
		'regular' => max(0.0, (float) $regular),
		'current' => max(0.0, (float) $current),
	);
}

function al_b2b_get_wholesale_user_id() {
	$current_user_id = (int) get_current_user_id();
	if ($current_user_id <= 0) {
		return 0;
	}

	static $cache = array();
	if (array_key_exists($current_user_id, $cache)) {
		return (int) $cache[$current_user_id];
	}

	$current_user = wp_get_current_user();
	if (!$current_user || !isset($current_user->ID) || (int) $current_user->ID !== $current_user_id) {
		$cache[$current_user_id] = 0;
		return 0;
	}

	$cache[$current_user_id] = al_b2b_is_wholesale_approved_user($current_user) ? $current_user_id : 0;
	return (int) $cache[$current_user_id];
}

function al_b2b_calculate_wholesale_price_data($product) {
	$user_id = al_b2b_get_wholesale_user_id();
	if ($user_id <= 0) {
		return null;
	}

	if (!$product || !is_a($product, 'WC_Product')) {
		return null;
	}

	$product_id = (int) $product->get_id();
	if ($product_id <= 0) {
		return null;
	}

	static $cache = array();
	$cache_key = $user_id . ':' . $product_id;
	if (array_key_exists($cache_key, $cache)) {
		return $cache[$cache_key];
	}

	$base = al_b2b_get_product_base_price_data($product);
	if (!$base) {
		$cache[$cache_key] = null;
		return null;
	}

	$regular = (float) $base['regular'];
	$retail_active = (float) $base['current'];
	$rule = al_b2b_get_wholesale_rule_for_product($product);
	$price = $retail_active;

	if ($rule && isset($rule['type'], $rule['value'])) {
		if ($rule['type'] === 'fixed_price') {
			$price = max(0.0, (float) $rule['value']);
		} elseif ($rule['type'] === 'percent') {
			$percent = max(0.0, min(100.0, (float) $rule['value']));
			$discounted = $regular * (1 - ($percent / 100));
			$price = max(0.0, min($discounted, $retail_active));
		}
	}

	if (function_exists('wc_get_price_decimals')) {
		$decimals = wc_get_price_decimals();
		$regular = (float) round($regular, $decimals);
		$price = (float) round($price, $decimals);
	}

	$has_discount = $price < $regular;
	$result = array(
		'regular' => $regular,
		'price' => $price,
		'hasDiscount' => $has_discount,
		'sale_price' => $has_discount ? $price : null,
		'rule' => $rule,
	);

	$cache[$cache_key] = $result;
	return $result;
}

function al_b2b_filter_wholesale_price($price, $product) {
	$calculated = al_b2b_calculate_wholesale_price_data($product);
	if (!$calculated || !isset($calculated['price'])) {
		return $price;
	}

	return al_b2b_format_decimal_for_storage($calculated['price']);
}

function al_b2b_filter_wholesale_regular_price($regular_price, $product) {
	$calculated = al_b2b_calculate_wholesale_price_data($product);
	if (!$calculated || !isset($calculated['regular'])) {
		return $regular_price;
	}

	return al_b2b_format_decimal_for_storage($calculated['regular']);
}

function al_b2b_filter_wholesale_sale_price($sale_price, $product) {
	$calculated = al_b2b_calculate_wholesale_price_data($product);
	if (!$calculated) {
		return $sale_price;
	}

	if (empty($calculated['hasDiscount']) || !isset($calculated['sale_price'])) {
		return '';
	}

	return al_b2b_format_decimal_for_storage($calculated['sale_price']);
}

function al_b2b_save_decimal_post_meta($post_id, $meta_key, $raw_value, $min = null, $max = null) {
	$post_id = (int) $post_id;
	$meta_key = (string) $meta_key;
	if ($post_id <= 0 || !$meta_key) {
		return;
	}

	$value = al_b2b_parse_decimal($raw_value);
	if ($value === null) {
		delete_post_meta($post_id, $meta_key);
		return;
	}

	if ($min !== null) {
		$value = max((float) $min, $value);
	}
	if ($max !== null) {
		$value = min((float) $max, $value);
	}

	update_post_meta($post_id, $meta_key, al_b2b_format_decimal_for_storage($value));
}

function al_b2b_save_decimal_term_meta($term_id, $meta_key, $raw_value, $min = null, $max = null) {
	$term_id = (int) $term_id;
	$meta_key = (string) $meta_key;
	if ($term_id <= 0 || !$meta_key) {
		return;
	}

	$value = al_b2b_parse_decimal($raw_value);
	if ($value === null) {
		delete_term_meta($term_id, $meta_key);
		return;
	}

	if ($min !== null) {
		$value = max((float) $min, $value);
	}
	if ($max !== null) {
		$value = min((float) $max, $value);
	}

	update_term_meta($term_id, $meta_key, al_b2b_format_decimal_for_storage($value));
}

function al_b2b_render_product_wholesale_fields() {
	if (!function_exists('woocommerce_wp_text_input') || !function_exists('get_woocommerce_currency_symbol')) {
		return;
	}

	$currency_symbol = get_woocommerce_currency_symbol();

	echo '<div class="options_group">';
	woocommerce_wp_text_input(array(
		'id' => AL_B2B_WHOLESALE_PRICE_META,
		'label' => sprintf('Wholesale fixed price (%s)', $currency_symbol),
		'description' => 'Optional fixed wholesale price override for this product. Takes precedence over percentage rules.',
		'desc_tip' => true,
		'type' => 'number',
		'custom_attributes' => array(
			'step' => '0.01',
			'min' => '0',
		),
	));

	woocommerce_wp_text_input(array(
		'id' => AL_B2B_WHOLESALE_PERCENT_META,
		'label' => 'Wholesale discount (%)',
		'description' => 'Optional wholesale discount percent for this product (0-100). Used when fixed price is empty.',
		'desc_tip' => true,
		'type' => 'number',
		'custom_attributes' => array(
			'step' => '0.01',
			'min' => '0',
			'max' => '100',
		),
	));
	echo '</div>';
}

function al_b2b_save_product_wholesale_fields($product_id) {
	$product_id = (int) $product_id;
	if ($product_id <= 0 || !current_user_can('edit_post', $product_id)) {
		return;
	}

	$fixed_raw = isset($_POST[AL_B2B_WHOLESALE_PRICE_META]) ? wp_unslash($_POST[AL_B2B_WHOLESALE_PRICE_META]) : '';
	$percent_raw = isset($_POST[AL_B2B_WHOLESALE_PERCENT_META]) ? wp_unslash($_POST[AL_B2B_WHOLESALE_PERCENT_META]) : '';

	al_b2b_save_decimal_post_meta($product_id, AL_B2B_WHOLESALE_PRICE_META, $fixed_raw, 0, null);
	al_b2b_save_decimal_post_meta($product_id, AL_B2B_WHOLESALE_PERCENT_META, $percent_raw, 0, 100);
}

function al_b2b_render_variation_wholesale_fields($loop, $variation_data, $variation) {
	if (!function_exists('woocommerce_wp_text_input') || !function_exists('get_woocommerce_currency_symbol')) {
		return;
	}

	$variation_id = isset($variation->ID) ? (int) $variation->ID : 0;
	if ($variation_id <= 0) {
		return;
	}

	$currency_symbol = get_woocommerce_currency_symbol();
	$fixed_value = get_post_meta($variation_id, AL_B2B_WHOLESALE_PRICE_META, true);
	$percent_value = get_post_meta($variation_id, AL_B2B_WHOLESALE_PERCENT_META, true);

	echo '<div class="form-row form-row-full">';
	woocommerce_wp_text_input(array(
		'id' => 'al_b2b_wholesale_price_' . $loop,
		'name' => 'al_b2b_wholesale_price[' . $loop . ']',
		'label' => sprintf('Wholesale fixed price (%s)', $currency_symbol),
		'description' => 'Optional variation-level fixed wholesale price.',
		'desc_tip' => true,
		'type' => 'number',
		'value' => $fixed_value,
		'custom_attributes' => array(
			'step' => '0.01',
			'min' => '0',
		),
	));
	woocommerce_wp_text_input(array(
		'id' => 'al_b2b_wholesale_percent_' . $loop,
		'name' => 'al_b2b_wholesale_percent[' . $loop . ']',
		'label' => 'Wholesale discount (%)',
		'description' => 'Optional variation-level discount percent (0-100).',
		'desc_tip' => true,
		'type' => 'number',
		'value' => $percent_value,
		'custom_attributes' => array(
			'step' => '0.01',
			'min' => '0',
			'max' => '100',
		),
	));
	echo '</div>';
}

function al_b2b_save_variation_wholesale_fields($variation_id, $index) {
	$variation_id = (int) $variation_id;
	$index = (int) $index;
	if ($variation_id <= 0 || !current_user_can('edit_post', $variation_id)) {
		return;
	}

	$fixed_values = isset($_POST['al_b2b_wholesale_price']) && is_array($_POST['al_b2b_wholesale_price'])
		? $_POST['al_b2b_wholesale_price']
		: array();
	$percent_values = isset($_POST['al_b2b_wholesale_percent']) && is_array($_POST['al_b2b_wholesale_percent'])
		? $_POST['al_b2b_wholesale_percent']
		: array();

	$fixed_raw = isset($fixed_values[$index]) ? wp_unslash($fixed_values[$index]) : '';
	$percent_raw = isset($percent_values[$index]) ? wp_unslash($percent_values[$index]) : '';

	al_b2b_save_decimal_post_meta($variation_id, AL_B2B_WHOLESALE_PRICE_META, $fixed_raw, 0, null);
	al_b2b_save_decimal_post_meta($variation_id, AL_B2B_WHOLESALE_PERCENT_META, $percent_raw, 0, 100);
}

function al_b2b_render_product_cat_wholesale_add_fields() {
	?>
	<div class="form-field term-wholesale-discount-wrap">
		<label for="<?php echo esc_attr(AL_B2B_WHOLESALE_TERM_PERCENT_META); ?>">Wholesale discount (%)</label>
		<input
			type="number"
			step="0.01"
			min="0"
			max="100"
			name="<?php echo esc_attr(AL_B2B_WHOLESALE_TERM_PERCENT_META); ?>"
			id="<?php echo esc_attr(AL_B2B_WHOLESALE_TERM_PERCENT_META); ?>"
			value=""
		/>
		<p class="description">Optional default wholesale discount percent for this category (0-100).</p>
	</div>
	<?php
}

function al_b2b_render_product_cat_wholesale_edit_fields($term) {
	$term_id = isset($term->term_id) ? (int) $term->term_id : 0;
	$value = $term_id > 0 ? get_term_meta($term_id, AL_B2B_WHOLESALE_TERM_PERCENT_META, true) : '';
	?>
	<tr class="form-field term-wholesale-discount-wrap">
		<th scope="row">
			<label for="<?php echo esc_attr(AL_B2B_WHOLESALE_TERM_PERCENT_META); ?>">Wholesale discount (%)</label>
		</th>
		<td>
			<input
				type="number"
				step="0.01"
				min="0"
				max="100"
				name="<?php echo esc_attr(AL_B2B_WHOLESALE_TERM_PERCENT_META); ?>"
				id="<?php echo esc_attr(AL_B2B_WHOLESALE_TERM_PERCENT_META); ?>"
				value="<?php echo esc_attr((string) $value); ?>"
			/>
			<p class="description">Optional default wholesale discount percent for this category (0-100).</p>
		</td>
	</tr>
	<?php
}

function al_b2b_save_product_cat_wholesale_fields($term_id) {
	$term_id = (int) $term_id;
	if ($term_id <= 0 || !current_user_can('manage_product_terms')) {
		return;
	}

	$raw_value = isset($_POST[AL_B2B_WHOLESALE_TERM_PERCENT_META])
		? wp_unslash($_POST[AL_B2B_WHOLESALE_TERM_PERCENT_META])
		: '';

	al_b2b_save_decimal_term_meta($term_id, AL_B2B_WHOLESALE_TERM_PERCENT_META, $raw_value, 0, 100);
}

function al_b2b_parse_bearer_token($request) {
	$token = AL_B2B_Base_REST_Controller::extract_bearer_from_request($request);
	return $token === '' ? null : $token;
}

/**
 * Authenticate a REST request via Bearer token.
 *
 * @return WP_User|WP_Error  The authenticated user, or a WP_Error (401).
 */
function al_b2b_authenticate_request($request) {
	$token = al_b2b_parse_bearer_token($request);
	if (!$token) {
		return new WP_Error('unauthorized', 'Not authenticated.', array('status' => 401));
	}

	$user = al_b2b_get_user_from_token($token);
	if (!$user) {
		return new WP_Error('unauthorized', 'Session expired or invalid.', array('status' => 401));
	}

	return $user;
}

function al_b2b_issue_session($user_id) {
	return AL_B2B_Plugin::instance()->get_auth_strategy()->issue_session((int) $user_id);
}

function al_b2b_delete_session($token) {
	if (!$token) {
		return;
	}
	AL_B2B_Plugin::instance()->get_auth_strategy()->revoke_session((string) $token);
}

function al_b2b_delete_sessions_for_user($user_id) {
	AL_B2B_Plugin::instance()->get_auth_strategy()->revoke_all_sessions((int) $user_id);
}

function al_b2b_get_user_from_token($token) {
	if (!$token) {
		return null;
	}
	$user_id = AL_B2B_Plugin::instance()->get_auth_strategy()->resolve_user_id_from_token((string) $token);
	if ($user_id <= 0) {
		return null;
	}
	$user = get_user_by('id', $user_id);
	return $user instanceof WP_User ? $user : null;
}

function al_b2b_decode_cart_token_payload($cart_token) {
	$cart_token = trim((string) $cart_token);
	$parts = explode('.', $cart_token);
	if (count($parts) !== 3) {
		return null;
	}

	$json = al_b2b_base64url_decode($parts[1]);
	if (!$json) {
		return null;
	}

	$payload = json_decode($json, true);
	return is_array($payload) ? $payload : null;
}

function al_b2b_fetch_store_cart_by_token($cart_token) {
	global $wpdb;

	$payload = al_b2b_decode_cart_token_payload($cart_token);
	if (!$payload || empty($payload['user_id'])) {
		al_b2b_log_checkout_bridge_error('Cart token payload could not be decoded or is missing user_id.', array(
			'cart_token_present' => !empty($cart_token),
		));
		return null;
	}

	$session_key = (string) $payload['user_id'];
	$sessions_table = $wpdb->prefix . 'woocommerce_sessions';

	$session_value = $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->prepare(
			"SELECT session_value FROM {$sessions_table} WHERE session_key = %s LIMIT 1",
			$session_key
		)
	);

	if (!$session_value) {
		al_b2b_log_checkout_bridge_error('No WooCommerce session found for cart token session key.', array(
			'session_key' => $session_key,
		));
		return null;
	}

	$session_data = maybe_unserialize($session_value);
	if (!is_array($session_data) || empty($session_data['cart'])) {
		al_b2b_log_checkout_bridge_error('WooCommerce session has no cart data.', array(
			'session_key' => $session_key,
		));
		return null;
	}

	$raw_cart = maybe_unserialize($session_data['cart']);
	if (!is_array($raw_cart) || empty($raw_cart)) {
		return null;
	}

	$items = array();
	foreach ($raw_cart as $cart_item_key => $cart_item) {
		if (!is_array($cart_item) || empty($cart_item['product_id'])) {
			continue;
		}

		$variation_id = isset($cart_item['variation_id']) ? (int) $cart_item['variation_id'] : 0;
		$product_id   = (int) $cart_item['product_id'];
		$quantity     = isset($cart_item['quantity']) ? max(1, (int) $cart_item['quantity']) : 1;

		$items[] = array(
			'id'        => $variation_id > 0 ? $variation_id : $product_id,
			'quantity'  => $quantity,
			'type'      => $variation_id > 0 ? 'variation' : 'simple',
			'key'       => $cart_item_key,
			'variation' => isset($cart_item['variation']) && is_array($cart_item['variation']) ? $cart_item['variation'] : array(),
		);
	}

	return array('items' => $items);
}

function al_b2b_log_checkout_bridge_error($message, $context = array()) {
	$message = is_string($message) ? trim($message) : 'Checkout bridge error';
	$context = is_array($context) ? $context : array();

	if (function_exists('wc_get_logger')) {
		$logger = wc_get_logger();
		if ($logger && method_exists($logger, 'error')) {
			$logger->error(
				$message . (!empty($context) ? ' ' . wp_json_encode($context) : ''),
				array('source' => 'al-b2b-checkout-bridge')
			);
			return;
		}
	}

	error_log('[al-b2b-checkout-bridge] ' . $message . (!empty($context) ? ' ' . wp_json_encode($context) : '')); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
}

function al_b2b_get_checkout_bridge_failure_url($code) {
	$code = sanitize_key((string) $code);
	return al_b2b_build_frontend_url('cart', array(
		'checkout_error' => $code ? $code : 'bridge_sync_failed',
	));
}

function al_b2b_sync_wc_cart_from_store_token($cart_token, $bridge_user_id = 0) {
	$result = array(
		'ok' => false,
		'error_code' => 'bridge_sync_failed',
		'source_line_count' => 0,
		'source_quantity_total' => 0,
		'final_quantity_total' => 0,
		'failed_lines' => 0,
	);
	$previous_user_id = get_current_user_id();

	try {
		if (!function_exists('WC') || !function_exists('wc_load_cart') || !function_exists('wc_get_product')) {
			$result['error_code'] = 'woocommerce_unavailable';
			return $result;
		}

		$bridge_user_id = (int) $bridge_user_id;
		if ($bridge_user_id > 0) {
			$user = get_user_by('id', $bridge_user_id);
			if (!$user) {
				$result['error_code'] = 'bridge_user_invalid';
				return $result;
			}

			wp_set_current_user($bridge_user_id);
		}

		$store_cart = al_b2b_fetch_store_cart_by_token($cart_token);
		if (!$store_cart || !isset($store_cart['items']) || !is_array($store_cart['items'])) {
			$result['error_code'] = 'store_cart_unavailable';
			return $result;
		}

		$result['source_line_count'] = count($store_cart['items']);
		if ($result['source_line_count'] <= 0) {
			$result['error_code'] = 'store_cart_empty';
			return $result;
		}

		wc_load_cart();
		if (!WC()->session || !WC()->cart) {
			$result['error_code'] = 'wc_cart_unavailable';
			return $result;
		}

		if (method_exists(WC()->session, 'set_customer_session_cookie')) {
			WC()->session->set_customer_session_cookie(true);
		}

		if (function_exists('wc_clear_notices')) {
			wc_clear_notices();
		}

		WC()->cart->empty_cart();

		foreach ($store_cart['items'] as $item) {
			if (!is_array($item)) {
				continue;
			}

			$raw_product_id = isset($item['id']) ? (int) $item['id'] : 0;
			$quantity = isset($item['quantity']) ? max(1, (int) $item['quantity']) : 1;

			if ($raw_product_id <= 0 || $quantity <= 0) {
				continue;
			}

			$result['source_quantity_total'] += $quantity;

			$product = wc_get_product($raw_product_id);
			if (!$product) {
				$result['failed_lines'] += 1;
				al_b2b_log_checkout_bridge_error('Bridge sync could not resolve product from Store API cart item.', array(
					'raw_product_id' => $raw_product_id,
					'item_type' => isset($item['type']) ? $item['type'] : '',
					'item_key' => isset($item['key']) ? $item['key'] : '',
				));
				continue;
			}

			$product_id = $raw_product_id;
			$variation_id = 0;
			$variation_data = array();

			if ($product->is_type('variation')) {
				$variation_id = $raw_product_id;
				$product_id = (int) $product->get_parent_id();
				if ($product_id <= 0) {
					continue;
				}
				$variation_data = $product->get_variation_attributes();
			}

			try {
				$cart_item_key = WC()->cart->add_to_cart($product_id, $quantity, $variation_id, $variation_data);
				if (!$cart_item_key) {
					$result['failed_lines'] += 1;
					$notices = function_exists('wc_get_notices') ? wc_get_notices('error') : array();
					al_b2b_log_checkout_bridge_error('Failed to add cart line item during bridge sync.', array(
						'product_id' => $product_id,
						'variation_id' => $variation_id,
						'item_key' => isset($item['key']) ? $item['key'] : '',
						'item_type' => isset($item['type']) ? $item['type'] : '',
						'variation_data' => $variation_data,
						'store_variation' => isset($item['variation']) ? $item['variation'] : array(),
						'notices' => is_array($notices) ? $notices : array(),
					));
					if (function_exists('wc_clear_notices')) {
						wc_clear_notices();
					}
				}
			} catch (Throwable $item_error) {
				$result['failed_lines'] += 1;
				al_b2b_log_checkout_bridge_error('Failed to add cart line item during bridge sync.', array(
					'product_id' => $product_id,
					'variation_id' => $variation_id,
					'item_key' => isset($item['key']) ? $item['key'] : '',
					'item_type' => isset($item['type']) ? $item['type'] : '',
					'variation_data' => $variation_data,
					'store_variation' => isset($item['variation']) ? $item['variation'] : array(),
					'message' => $item_error->getMessage(),
				));
			}
		}

		WC()->cart->calculate_totals();

		if (method_exists(WC()->cart, 'set_session')) {
			WC()->cart->set_session();
		}

		if (method_exists(WC()->session, 'save_data')) {
			WC()->session->save_data();
		}

		if (function_exists('wc_setcookie')) {
			$has_items = WC()->cart->get_cart_contents_count() > 0 ? '1' : '0';
			wc_setcookie('woocommerce_items_in_cart', $has_items);
			wc_setcookie('woocommerce_cart_hash', WC()->cart->get_cart_hash());
		}

		$result['final_quantity_total'] = (int) WC()->cart->get_cart_contents_count();
		if (
			$result['source_quantity_total'] <= 0 ||
			$result['failed_lines'] > 0 ||
			$result['final_quantity_total'] !== $result['source_quantity_total']
		) {
			$result['error_code'] = 'bridge_cart_mismatch';
			WC()->cart->empty_cart();
			if (method_exists(WC()->cart, 'set_session')) {
				WC()->cart->set_session();
			}
			if (method_exists(WC()->session, 'save_data')) {
				WC()->session->save_data();
			}
			return $result;
		}

		$result['ok'] = true;
		$result['error_code'] = '';
		return $result;
	} catch (Throwable $error) {
		al_b2b_log_checkout_bridge_error('Bridge cart sync crashed.', array(
			'message' => $error->getMessage(),
			'file' => $error->getFile(),
			'line' => $error->getLine(),
		));
		$result['error_code'] = 'bridge_crashed';
		return $result;
	} finally {
		if ((int) $bridge_user_id > 0) {
			wp_set_current_user($previous_user_id);
		}
	}
}

/**
 * Shared bridge execution: parse → sync cart → authenticate → redirect.
 * Both the template_redirect hook and the REST endpoint funnel through here.
 */
function al_b2b_execute_checkout_bridge($encoded_payload, $signature) {
	$checkout_url = function_exists('wc_get_checkout_url') ? wc_get_checkout_url() : home_url('/checkout');

	try {
		$payload = al_b2b_parse_checkout_bridge_payload($encoded_payload, $signature);

		if (!$payload || !isset($payload['cartToken'])) {
			wp_safe_redirect(al_b2b_get_checkout_bridge_failure_url('bridge_invalid'));
			exit;
		}

		$bridge_user_id = isset($payload['userId']) ? (int) $payload['userId'] : 0;

		$sync_result = al_b2b_sync_wc_cart_from_store_token($payload['cartToken'], $bridge_user_id);
		if (empty($sync_result['ok'])) {
			al_b2b_log_checkout_bridge_error('Bridge cart sync did not complete successfully.', array(
				'error_code'            => isset($sync_result['error_code'])            ? $sync_result['error_code']            : 'bridge_sync_failed',
				'source_line_count'     => isset($sync_result['source_line_count'])     ? $sync_result['source_line_count']     : 0,
				'source_quantity_total' => isset($sync_result['source_quantity_total']) ? $sync_result['source_quantity_total'] : 0,
				'final_quantity_total'  => isset($sync_result['final_quantity_total'])  ? $sync_result['final_quantity_total']  : 0,
				'failed_lines'          => isset($sync_result['failed_lines'])          ? $sync_result['failed_lines']          : 0,
			));
			wp_safe_redirect(al_b2b_get_checkout_bridge_failure_url(
				isset($sync_result['error_code']) ? $sync_result['error_code'] : 'bridge_sync_failed'
			));
			exit;
		}

		// Log the user into WordPress so they arrive at checkout already authenticated.
		// For guests (no userId), WooCommerce guest checkout handles the session.
		//
		// Important safety: if an administrator is already logged in on this domain in
		// the same browser session, do not overwrite that admin auth cookie with a
		// customer account during bridge redirect.
		if ($bridge_user_id > 0) {
			$current_user_id = (int) get_current_user_id();
			$current_user = $current_user_id > 0 ? get_user_by('id', $current_user_id) : null;
			$should_preserve_admin_session =
				$current_user &&
				isset($current_user->ID) &&
				(int) $current_user->ID !== (int) $bridge_user_id &&
				user_can($current_user, 'manage_options');

			if ($should_preserve_admin_session) {
				al_b2b_log_checkout_bridge_error('Checkout bridge preserved existing admin auth session.', array(
					'admin_user_id' => (int) $current_user->ID,
					'bridge_user_id' => (int) $bridge_user_id,
				));
			} else {
				wp_set_current_user($bridge_user_id);
				wp_set_auth_cookie($bridge_user_id, false);
			}
		}

		wp_safe_redirect($checkout_url);
		exit;
	} catch (Throwable $error) {
		al_b2b_log_checkout_bridge_error('Checkout bridge crashed.', array(
			'message' => $error->getMessage(),
			'file'    => $error->getFile(),
			'line'    => $error->getLine(),
		));
		wp_safe_redirect(al_b2b_get_checkout_bridge_failure_url('bridge_crashed'));
		exit;
	}
}

function al_b2b_maybe_handle_checkout_bridge() {
	$encoded_payload = isset($_GET['al_b2b_checkout_bridge']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		? wp_unslash($_GET['al_b2b_checkout_bridge']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		: '';
	$signature = isset($_GET['sig']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		? wp_unslash($_GET['sig']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		: '';

	if (!$encoded_payload || !$signature) {
		return;
	}

	al_b2b_execute_checkout_bridge($encoded_payload, $signature);
}

function al_b2b_rest_checkout_bridge(WP_REST_Request $request) {
	$encoded_payload = trim((string) ($request->get_param('al_b2b_checkout_bridge') ?? ''));
	$signature       = trim((string) ($request->get_param('sig') ?? ''));

	if (!$encoded_payload || !$signature) {
		wp_safe_redirect(al_b2b_get_checkout_bridge_failure_url('bridge_invalid'));
		exit;
	}

	al_b2b_execute_checkout_bridge($encoded_payload, $signature);
}

function al_b2b_get_country_label($country_code) {
	$country_code = strtoupper(trim((string) $country_code));
	if (!$country_code) {
		return '';
	}

	if (function_exists('WC') && WC() && isset(WC()->countries) && isset(WC()->countries->countries[$country_code])) {
		return (string) WC()->countries->countries[$country_code];
	}

	return $country_code;
}

function al_b2b_map_order_address($order, $type) {
	$type = $type === 'shipping' ? 'shipping' : 'billing';

	if ($type === 'billing') {
		$first_name = method_exists($order, 'get_billing_first_name') ? (string) $order->get_billing_first_name() : '';
		$last_name  = method_exists($order, 'get_billing_last_name')  ? (string) $order->get_billing_last_name()  : '';
		$company    = method_exists($order, 'get_billing_company')    ? (string) $order->get_billing_company()    : '';
		$address_1  = method_exists($order, 'get_billing_address_1')  ? (string) $order->get_billing_address_1()  : '';
		$address_2  = method_exists($order, 'get_billing_address_2')  ? (string) $order->get_billing_address_2()  : '';
		$city       = method_exists($order, 'get_billing_city')       ? (string) $order->get_billing_city()       : '';
		$state      = method_exists($order, 'get_billing_state')      ? (string) $order->get_billing_state()      : '';
		$postcode   = method_exists($order, 'get_billing_postcode')   ? (string) $order->get_billing_postcode()   : '';
		$country    = method_exists($order, 'get_billing_country')    ? (string) $order->get_billing_country()    : '';
		$email      = method_exists($order, 'get_billing_email')      ? (string) $order->get_billing_email()      : '';
		$phone      = method_exists($order, 'get_billing_phone')      ? (string) $order->get_billing_phone()      : '';
	} else {
		$first_name = method_exists($order, 'get_shipping_first_name') ? (string) $order->get_shipping_first_name() : '';
		$last_name  = method_exists($order, 'get_shipping_last_name')  ? (string) $order->get_shipping_last_name()  : '';
		$company    = method_exists($order, 'get_shipping_company')    ? (string) $order->get_shipping_company()    : '';
		$address_1  = method_exists($order, 'get_shipping_address_1')  ? (string) $order->get_shipping_address_1()  : '';
		$address_2  = method_exists($order, 'get_shipping_address_2')  ? (string) $order->get_shipping_address_2()  : '';
		$city       = method_exists($order, 'get_shipping_city')       ? (string) $order->get_shipping_city()       : '';
		$state      = method_exists($order, 'get_shipping_state')      ? (string) $order->get_shipping_state()      : '';
		$postcode   = method_exists($order, 'get_shipping_postcode')   ? (string) $order->get_shipping_postcode()   : '';
		$country    = method_exists($order, 'get_shipping_country')    ? (string) $order->get_shipping_country()    : '';
		$email      = '';
		$phone      = '';
	}

	$lines = array_values(array_filter(array(
		trim($company),
		trim($address_1),
		trim($address_2),
		trim(implode(', ', array_filter(array($city, $state, $postcode)))),
		al_b2b_get_country_label($country),
	)));

	return array(
		'name' => trim($first_name . ' ' . $last_name),
		'company' => $company,
		'address1' => $address_1,
		'address2' => $address_2,
		'city' => $city,
		'state' => $state,
		'postcode' => $postcode,
		'country' => al_b2b_get_country_label($country),
		'email' => $email,
		'phone' => $phone,
		'lines' => $lines,
	);
}

function al_b2b_map_order_item_meta($item) {
	$meta_entries = array();
	$meta_data = method_exists($item, 'get_meta_data') ? $item->get_meta_data() : array();

	foreach ($meta_data as $meta) {
		$key = isset($meta->key) ? (string) $meta->key : '';
		if (!$key || strpos($key, '_') === 0) {
			continue;
		}

		$value = isset($meta->value) ? $meta->value : '';
		if (is_array($value)) {
			$value = implode(', ', array_map('strval', $value));
		}

		$value = wp_strip_all_tags((string) $value);
		if ($value === '') {
			continue;
		}

		$meta_entries[] = array(
			'label' => function_exists('wc_attribute_label') ? wc_attribute_label($key) : $key,
			'value' => $value,
		);
	}

	return $meta_entries;
}

function al_b2b_format_order_money($amount, $currency) {
	if (!function_exists('wc_price')) {
		return (string) $amount;
	}

	$formatted = wc_price((float) $amount, array('currency' => (string) $currency));
	$formatted = wp_strip_all_tags($formatted);
	$formatted = html_entity_decode($formatted, ENT_QUOTES, 'UTF-8');

	return trim((string) $formatted);
}

function al_b2b_map_order_line_item($item) {
	if (!$item || !is_a($item, 'WC_Order_Item_Product')) {
		return null;
	}

	$product = $item->get_product();
	$image = '';

	if ($product && method_exists($product, 'get_image_id')) {
		$image_id = (int) $product->get_image_id();
		if ($image_id > 0) {
			$image = (string) wp_get_attachment_image_url($image_id, 'woocommerce_thumbnail');
		}
	}

	$quantity = (int) $item->get_quantity();
	$total = (float) $item->get_total();
	$subtotal = (float) $item->get_subtotal();
	$unit_price = $quantity > 0 ? $subtotal / $quantity : $subtotal;
	$order = method_exists($item, 'get_order') ? $item->get_order() : null;
	$currency = $order && method_exists($order, 'get_currency') ? (string) $order->get_currency() : '';

	return array(
		'id' => method_exists($item, 'get_product_id') ? (int) $item->get_product_id() : 0,
		'variationId' => method_exists($item, 'get_variation_id') ? (int) $item->get_variation_id() : 0,
		'name' => (string) $item->get_name(),
		'quantity' => $quantity,
		'unitPrice' => al_b2b_format_order_money($unit_price, $currency),
		'lineTotal' => al_b2b_format_order_money($total, $currency),
		'image' => $image,
		'sku' => $product && method_exists($product, 'get_sku') ? (string) $product->get_sku() : '',
		'meta' => al_b2b_map_order_item_meta($item),
	);
}

function al_b2b_map_order_summary($order) {
	if (!$order || !is_a($order, 'WC_Order')) {
		return null;
	}

	if (al_b2b_is_hidden_order_status($order->get_status())) {
		return null;
	}

	$currency = method_exists($order, 'get_currency') ? (string) $order->get_currency() : '';
	$line_items = array();

	foreach ($order->get_items() as $item) {
		if (!$item || !is_a($item, 'WC_Order_Item_Product')) {
			continue;
		}

		$line_items[] = array(
			'name' => (string) $item->get_name(),
			'quantity' => (int) $item->get_quantity(),
		);
	}

	$line_count = count($line_items);
	$preview_items = array_slice($line_items, 0, 3);
	$receipt_token = al_b2b_create_order_receipt_token($order);

	return array(
		'orderId' => (int) $order->get_id(),
		'orderNumber' => (string) $order->get_order_number(),
		'status' => (string) $order->get_status(),
		'statusLabel' => function_exists('wc_get_order_status_name') ? wc_get_order_status_name($order->get_status()) : (string) $order->get_status(),
		'createdAt' => method_exists($order, 'get_date_created') && $order->get_date_created() ? $order->get_date_created()->date_i18n('j M Y, g:i a') : '',
		'paymentMethod' => method_exists($order, 'get_payment_method_title') ? (string) $order->get_payment_method_title() : '',
		'itemCount' => $line_count,
		'total' => al_b2b_format_order_money($order->get_total(), $currency),
		'previewItems' => $preview_items,
		'hasReceipt' => !empty($receipt_token),
		'receiptToken' => $receipt_token,
	);
}

function al_b2b_normalize_lookup_value($value) {
	$value = strtoupper(trim((string) $value));
	return preg_replace('/[^A-Z0-9-]/', '', $value);
}

function al_b2b_normalize_order_status_slug($status) {
	$status = sanitize_key((string) $status);
	if (strpos($status, 'wc-') === 0) {
		$status = substr($status, 3);
	}

	return $status;
}

function al_b2b_get_hidden_order_statuses() {
	$default = array(
		'checkout-draft',
		'draft',
		'auto-draft',
	);

	$statuses = apply_filters('al_b2b_hidden_order_statuses', $default);
	if (!is_array($statuses)) {
		$statuses = $default;
	}

	$normalized = array();
	foreach ($statuses as $status) {
		$slug = al_b2b_normalize_order_status_slug($status);
		if ($slug !== '') {
			$normalized[$slug] = true;
		}
	}

	return array_keys($normalized);
}

function al_b2b_is_hidden_order_status($status) {
	$slug = al_b2b_normalize_order_status_slug($status);
	if ($slug === '') {
		return false;
	}

	return in_array($slug, al_b2b_get_hidden_order_statuses(), true);
}

function al_b2b_get_visible_order_statuses_for_query() {
	if (!function_exists('wc_get_order_statuses')) {
		return array(
			'pending',
			'processing',
			'on-hold',
			'completed',
			'cancelled',
			'refunded',
			'failed',
		);
	}

	$hidden = al_b2b_get_hidden_order_statuses();
	$visible = array();
	$all_statuses = wc_get_order_statuses();

	foreach (array_keys($all_statuses) as $status_key) {
		$slug = al_b2b_normalize_order_status_slug($status_key);
		if ($slug === '' || in_array($slug, $hidden, true)) {
			continue;
		}

		$visible[] = $slug;
	}

	return array_values(array_unique($visible));
}

function al_b2b_map_user_address($user_id, $type, $email_fallback = '') {
	$user_id = (int) $user_id;
	$prefix = $type === 'shipping' ? 'shipping_' : 'billing_';
	$first_name = (string) get_user_meta($user_id, $prefix . 'first_name', true);
	$last_name = (string) get_user_meta($user_id, $prefix . 'last_name', true);
	$company = (string) get_user_meta($user_id, $prefix . 'company', true);
	$phone = (string) get_user_meta($user_id, $prefix . 'phone', true);
	$email = $type === 'billing' ? (string) get_user_meta($user_id, $prefix . 'email', true) : '';
	$address_1 = (string) get_user_meta($user_id, $prefix . 'address_1', true);
	$address_2 = (string) get_user_meta($user_id, $prefix . 'address_2', true);
	$city = (string) get_user_meta($user_id, $prefix . 'city', true);
	$state = (string) get_user_meta($user_id, $prefix . 'state', true);
	$postcode = (string) get_user_meta($user_id, $prefix . 'postcode', true);
	$country = (string) get_user_meta($user_id, $prefix . 'country', true);
	$name = trim($first_name . ' ' . $last_name);
	$lines = array_values(array_filter(array(
		$company,
		$address_1,
		$address_2,
		trim($city . ($state ? ', ' . $state : '') . ($postcode ? ' ' . $postcode : '')),
		$country,
	)));

	return array(
		'firstName' => $first_name,
		'lastName' => $last_name,
		'name' => $name,
		'company' => $company,
		'phone' => $phone,
		'email' => $email ? $email : ($type === 'billing' ? (string) $email_fallback : ''),
		'address1' => $address_1,
		'address2' => $address_2,
		'city' => $city,
		'state' => $state,
		'postcode' => $postcode,
		'country' => $country,
		'lines' => $lines,
	);
}

function al_b2b_sanitize_profile_address($raw, $type, $default_email) {
	$raw = is_array($raw) ? $raw : array();

	$address = array(
		'first_name' => sanitize_text_field(isset($raw['firstName']) ? (string) $raw['firstName'] : ''),
		'last_name' => sanitize_text_field(isset($raw['lastName']) ? (string) $raw['lastName'] : ''),
		'company' => sanitize_text_field(isset($raw['company']) ? (string) $raw['company'] : ''),
		'phone' => sanitize_text_field(isset($raw['phone']) ? (string) $raw['phone'] : ''),
		'address_1' => sanitize_text_field(isset($raw['address1']) ? (string) $raw['address1'] : ''),
		'address_2' => sanitize_text_field(isset($raw['address2']) ? (string) $raw['address2'] : ''),
		'city' => sanitize_text_field(isset($raw['city']) ? (string) $raw['city'] : ''),
		'state' => sanitize_text_field(isset($raw['state']) ? (string) $raw['state'] : ''),
		'postcode' => sanitize_text_field(isset($raw['postcode']) ? (string) $raw['postcode'] : ''),
		'country' => strtoupper(sanitize_text_field(isset($raw['country']) ? (string) $raw['country'] : '')),
	);

	if ($type === 'billing') {
		$email = isset($raw['email']) ? sanitize_email((string) $raw['email']) : '';
		$address['email'] = $email && is_email($email) ? $email : sanitize_email((string) $default_email);
	}

	return $address;
}

function al_b2b_update_profile_address($user_id, $type, $address) {
	$user_id = (int) $user_id;
	$address = is_array($address) ? $address : array();
	$prefix = $type === 'shipping' ? 'shipping_' : 'billing_';

	$fields = array(
		'first_name',
		'last_name',
		'company',
		'phone',
		'address_1',
		'address_2',
		'city',
		'state',
		'postcode',
		'country',
	);

	if ($type === 'billing') {
		$fields[] = 'email';
	}

	foreach ($fields as $field) {
		$value = isset($address[$field]) ? (string) $address[$field] : '';
		update_user_meta($user_id, $prefix . $field, $value);
	}
}

function al_b2b_build_order_confirmation_payload($order) {
	if (!$order || !is_a($order, 'WC_Order') || !function_exists('wc_get_order_status_name')) {
		return null;
	}

	if (al_b2b_is_hidden_order_status($order->get_status())) {
		return null;
	}

	$currency = method_exists($order, 'get_currency') ? (string) $order->get_currency() : '';
	$items = array();

	foreach ($order->get_items() as $item) {
		$mapped_item = al_b2b_map_order_line_item($item);
		if ($mapped_item) {
			$items[] = $mapped_item;
		}
	}

	$totals = array(
		'subtotal' => al_b2b_format_order_money($order->get_subtotal(), $currency),
		'shipping' => al_b2b_format_order_money($order->get_shipping_total(), $currency),
		'tax' => al_b2b_format_order_money($order->get_total_tax(), $currency),
		'total' => al_b2b_format_order_money($order->get_total(), $currency),
	);

	return array(
		'orderId' => (int) $order->get_id(),
		'orderNumber' => (string) $order->get_order_number(),
		'status' => (string) $order->get_status(),
		'statusLabel' => wc_get_order_status_name($order->get_status()),
		'createdAt' => method_exists($order, 'get_date_created') && $order->get_date_created() ? $order->get_date_created()->date_i18n('j M Y, g:i a') : '',
		'paymentMethod' => method_exists($order, 'get_payment_method_title') ? (string) $order->get_payment_method_title() : '',
		'customerNote' => method_exists($order, 'get_customer_note') ? (string) $order->get_customer_note() : '',
		'itemCount' => count($items),
		'items' => $items,
		'totals' => $totals,
		'billingAddress' => al_b2b_map_order_address($order, 'billing'),
		'shippingAddress' => al_b2b_map_order_address($order, 'shipping'),
	);
}

/**
 * Fetch WooCommerce orders for a user, with limit clamping.
 *
 * @param int $user_id
 * @param int $limit  Raw limit from the request (0 or negative → default 12, max 24).
 * @return WC_Order[]
 */
function al_b2b_fetch_user_orders($user_id, $limit) {
	$limit = (int) $limit;
	$limit = $limit > 0 ? min(24, $limit) : 12;
	$statuses = al_b2b_get_visible_order_statuses_for_query();

	$orders = wc_get_orders(array(
		'customer_id' => (int) $user_id,
		'status' => $statuses,
		'limit' => $limit,
		'orderby' => 'date',
		'order' => 'DESC',
		'return' => 'objects',
	));

	return is_array($orders) ? $orders : array();
}

function al_b2b_get_account_orders($request) {
	$user = al_b2b_authenticate_request($request);
	if (is_wp_error($user)) {
		return $user;
	}

	if (!function_exists('wc_get_orders') || !function_exists('wc_get_order_status_name')) {
		return new WP_Error('woocommerce_required', 'WooCommerce is required.', array('status' => 500));
	}

	$orders = al_b2b_fetch_user_orders($user->ID, (int) $request->get_param('limit'));

	$mapped_orders = array();
	foreach ($orders as $order) {
		$mapped = al_b2b_map_order_summary($order);
		if ($mapped) {
			$mapped_orders[] = $mapped;
		}
	}

	return rest_ensure_response(array(
		'orders' => $mapped_orders,
		'total' => count($mapped_orders),
	));
}

function al_b2b_get_account_dashboard($request) {
	$user = al_b2b_authenticate_request($request);
	if (is_wp_error($user)) {
		return $user;
	}

	if (!function_exists('wc_get_orders') || !function_exists('wc_get_order_status_name')) {
		return new WP_Error('woocommerce_required', 'WooCommerce is required.', array('status' => 500));
	}

	$orders = al_b2b_fetch_user_orders($user->ID, (int) $request->get_param('limit'));

	$mapped_orders = array();
	$initial_order_detail = null;

	foreach ($orders as $index => $order) {
		$mapped = al_b2b_map_order_summary($order);
		if ($mapped) {
			$mapped_orders[] = $mapped;
		}

		if ($index === 0 && !$initial_order_detail) {
			$payload = al_b2b_build_order_confirmation_payload($order);
			if ($payload) {
				$initial_order_detail = $payload;
			}
		}
	}

	return rest_ensure_response(array(
		'user' => al_b2b_map_user($user),
		'orders' => $mapped_orders,
		'total' => count($mapped_orders),
		'initialOrderDetail' => $initial_order_detail,
	));
}

function al_b2b_get_authenticated_order_detail($request) {
	$user = al_b2b_authenticate_request($request);
	if (is_wp_error($user)) {
		return $user;
	}

	if (!function_exists('wc_get_order') || !function_exists('wc_get_order_status_name')) {
		return new WP_Error('woocommerce_required', 'WooCommerce is required.', array('status' => 500));
	}

	$order_id = (int) $request->get_param('orderId');
	if ($order_id <= 0) {
		return new WP_Error('invalid_order', 'Order id is required.', array('status' => 400));
	}

	$order = wc_get_order($order_id);
	if (!$order) {
		return new WP_Error('order_not_found', 'Order not found.', array('status' => 404));
	}

	if (al_b2b_is_hidden_order_status($order->get_status())) {
		return new WP_Error('order_not_found', 'Order not found.', array('status' => 404));
	}

	if ((int) $order->get_customer_id() !== (int) $user->ID) {
		return new WP_Error('forbidden_order', 'Order could not be verified.', array('status' => 404));
	}

	$payload = al_b2b_build_order_confirmation_payload($order);
	if (!$payload) {
		return new WP_Error('order_unavailable', 'Order details could not be loaded.', array('status' => 500));
	}

	return rest_ensure_response($payload);
}

function al_b2b_lookup_guest_order($request) {
	$limit = al_b2b_guard_rate_limit('order_lookup', 12, 15 * MINUTE_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$email = isset($body['email']) ? sanitize_email((string) $body['email']) : '';
	$order_number = isset($body['orderNumber']) ? sanitize_text_field((string) $body['orderNumber']) : '';

	if (!$email || !is_email($email) || !$order_number) {
		return new WP_Error('invalid_lookup', 'Order number and billing email are required.', array('status' => 400));
	}

	if (!function_exists('wc_get_orders') || !function_exists('wc_get_order_status_name')) {
		return new WP_Error('woocommerce_required', 'WooCommerce is required.', array('status' => 500));
	}

	$target = al_b2b_normalize_lookup_value($order_number);
	$orders = wc_get_orders(array(
		'billing_email' => $email,
		'status' => al_b2b_get_visible_order_statuses_for_query(),
		'limit' => 20,
		'orderby' => 'date',
		'order' => 'DESC',
		'return' => 'objects',
	));

	$matched_order = null;
	if (is_array($orders)) {
		foreach ($orders as $order) {
			$candidate_number = al_b2b_normalize_lookup_value($order->get_order_number());
			$candidate_id = al_b2b_normalize_lookup_value((string) $order->get_id());
			if ($target === $candidate_number || $target === $candidate_id) {
				$matched_order = $order;
				break;
			}
		}
	}

	if (!$matched_order) {
		return new WP_Error('order_lookup_failed', 'We could not match that order number and billing email.', array('status' => 404));
	}

	$payload = al_b2b_build_order_confirmation_payload($matched_order);
	if (!$payload) {
		return new WP_Error('order_unavailable', 'Order details could not be loaded.', array('status' => 500));
	}

	$receipt_token = al_b2b_create_order_receipt_token($matched_order);
	$payload['hasReceipt'] = !empty($receipt_token);
	$payload['receiptToken'] = $receipt_token;

	return rest_ensure_response(array(
		'order' => $payload,
	));
}

function al_b2b_get_order_confirmation($request) {
	$receipt_token = trim((string) $request->get_param('receipt'));
	$order_id = 0;
	$order_key = '';

	if ($receipt_token) {
		$receipt_payload = al_b2b_parse_order_receipt_token($receipt_token);
		if (!$receipt_payload) {
			return new WP_Error('invalid_order_receipt', 'Order confirmation could not be verified.', array('status' => 404));
		}

		$order_id = (int) $receipt_payload['orderId'];
		$order_key = trim((string) $receipt_payload['key']);
	} else {
		$order_id = (int) $request->get_param('order_id');
		$order_key = trim((string) $request->get_param('key'));
	}

	if ($order_id <= 0 || !$order_key) {
		return new WP_Error('invalid_order_confirmation', 'Order confirmation request is missing required details.', array('status' => 400));
	}

	if (!function_exists('wc_get_order') || !function_exists('wc_price') || !function_exists('wc_get_order_status_name')) {
		return new WP_Error('woocommerce_required', 'WooCommerce is required.', array('status' => 500));
	}

	$order = wc_get_order($order_id);
	if (!$order) {
		return new WP_Error('order_not_found', 'Order not found.', array('status' => 404));
	}

	if (al_b2b_is_hidden_order_status($order->get_status())) {
		return new WP_Error('invalid_order_key', 'Order confirmation could not be verified.', array('status' => 404));
	}

	if (!hash_equals((string) $order->get_order_key(), $order_key)) {
		return new WP_Error('invalid_order_key', 'Order confirmation could not be verified.', array('status' => 404));
	}

	$payload = al_b2b_build_order_confirmation_payload($order);
	if (!$payload) {
		return new WP_Error('order_unavailable', 'Order details could not be loaded.', array('status' => 500));
	}

	return rest_ensure_response($payload);
}

function al_b2b_is_wholesale_approved_user($user) {
	if (!$user || !isset($user->ID)) {
		return false;
	}

	$roles = isset($user->roles) && is_array($user->roles) ? $user->roles : array();
	$status = (string) get_user_meta($user->ID, AL_B2B_CLINIC_STATUS_META, true);

	return in_array('wholesale_customer', $roles, true) && $status === 'approved';
}

function al_b2b_map_user($user) {
	$account_type = get_user_meta($user->ID, AL_B2B_ACCOUNT_TYPE_META, true);
	$clinic_status = get_user_meta($user->ID, AL_B2B_CLINIC_STATUS_META, true);
	$business_info = get_user_meta($user->ID, AL_B2B_BUSINESS_INFO_META, true);

	if (!is_array($business_info)) {
		$business_info = array();
	}

	return array(
		'id' => (int) $user->ID,
		'email' => (string) $user->user_email,
		'firstName' => (string) $user->first_name,
		'lastName' => (string) $user->last_name,
		'displayName' => (string) $user->display_name,
		'role' => isset($user->roles[0]) ? (string) $user->roles[0] : 'customer',
		'accountType' => $account_type === 'clinic' ? 'clinic' : 'retail',
		'clinicStatus' => $clinic_status ? (string) $clinic_status : null,
		'businessInfo' => $business_info,
		'billingAddress' => al_b2b_map_user_address($user->ID, 'billing', $user->user_email),
		'shippingAddress' => al_b2b_map_user_address($user->ID, 'shipping', $user->user_email),
		'emailVerified' => al_b2b_is_email_verified($user->ID),
		'wholesaleApproved' => al_b2b_is_wholesale_approved_user($user),
	);
}

function al_b2b_update_profile($request) {
	$user = al_b2b_authenticate_request($request);
	if (is_wp_error($user)) {
		return $user;
	}

	$body = al_b2b_get_json_body($request);

	$first_name = sanitize_text_field(isset($body['firstName']) ? (string) $body['firstName'] : $user->first_name);
	$last_name = sanitize_text_field(isset($body['lastName']) ? (string) $body['lastName'] : $user->last_name);
	$display_name = sanitize_text_field(isset($body['displayName']) ? (string) $body['displayName'] : $user->display_name);

	if (!$display_name) {
		$display_name = trim($first_name . ' ' . $last_name);
	}
	if (!$display_name) {
		$display_name = $user->display_name;
	}

	$update_result = wp_update_user(array(
		'ID' => (int) $user->ID,
		'first_name' => $first_name,
		'last_name' => $last_name,
		'display_name' => $display_name,
	));

	if (is_wp_error($update_result)) {
		return new WP_Error('profile_update_failed', 'Profile settings could not be updated.', array('status' => 500));
	}

	$billing_address = al_b2b_sanitize_profile_address(
		isset($body['billingAddress']) ? $body['billingAddress'] : array(),
		'billing',
		$user->user_email
	);
	$shipping_address = al_b2b_sanitize_profile_address(
		isset($body['shippingAddress']) ? $body['shippingAddress'] : array(),
		'shipping',
		$user->user_email
	);

	al_b2b_update_profile_address($user->ID, 'billing', $billing_address);
	al_b2b_update_profile_address($user->ID, 'shipping', $shipping_address);

	$account_type = get_user_meta($user->ID, AL_B2B_ACCOUNT_TYPE_META, true);
	if ($account_type === 'clinic' && isset($body['businessInfo']) && is_array($body['businessInfo'])) {
		$current_business_info = get_user_meta($user->ID, AL_B2B_BUSINESS_INFO_META, true);
		if (!is_array($current_business_info)) {
			$current_business_info = array();
		}

		$sanitized_business_info = array(
			'clinicName' => sanitize_text_field(isset($body['businessInfo']['clinicName']) ? (string) $body['businessInfo']['clinicName'] : (isset($current_business_info['clinicName']) ? (string) $current_business_info['clinicName'] : '')),
			'businessName' => sanitize_text_field(isset($body['businessInfo']['businessName']) ? (string) $body['businessInfo']['businessName'] : (isset($current_business_info['businessName']) ? (string) $current_business_info['businessName'] : '')),
			'licenseNumber' => sanitize_text_field(isset($body['businessInfo']['licenseNumber']) ? (string) $body['businessInfo']['licenseNumber'] : (isset($current_business_info['licenseNumber']) ? (string) $current_business_info['licenseNumber'] : '')),
			'taxId' => sanitize_text_field(isset($body['businessInfo']['taxId']) ? (string) $body['businessInfo']['taxId'] : (isset($current_business_info['taxId']) ? (string) $current_business_info['taxId'] : '')),
			'website' => esc_url_raw(isset($body['businessInfo']['website']) ? (string) $body['businessInfo']['website'] : (isset($current_business_info['website']) ? (string) $current_business_info['website'] : '')),
			'phone' => sanitize_text_field(isset($body['businessInfo']['phone']) ? (string) $body['businessInfo']['phone'] : (isset($current_business_info['phone']) ? (string) $current_business_info['phone'] : '')),
		);

		update_user_meta($user->ID, AL_B2B_BUSINESS_INFO_META, $sanitized_business_info);
	}

	$updated_user = get_user_by('id', (int) $user->ID);
	if (!$updated_user) {
		return new WP_Error('profile_unavailable', 'Updated profile could not be loaded.', array('status' => 500));
	}

	return rest_ensure_response(array(
		'user' => al_b2b_map_user($updated_user),
		'message' => 'Account settings updated.',
	));
}

function al_b2b_log_audit_event($action, $target_user_id, $actor_user_id, $details = array()) {
	global $wpdb;

	$table = al_b2b_get_audit_table_name();
	$wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$table,
		array(
			'action' => sanitize_key((string) $action),
			'target_user_id' => (int) $target_user_id,
			'actor_user_id' => (int) $actor_user_id,
			'ip_address' => al_b2b_get_request_ip(),
			'details' => wp_json_encode($details),
		),
		array('%s', '%d', '%d', '%s', '%s')
	);
}

function al_b2b_register_admin_menu() {
	add_users_page(
		'Clinic Applications',
		'Clinic Applications',
		'promote_users',
		'al-b2b-clinic-applications',
		'al_b2b_render_clinic_applications_page'
	);

	add_users_page(
		'Marketing Controls',
		'Marketing Controls',
		'promote_users',
		'al-b2b-marketing-reviews',
		'al_b2b_render_marketing_reviews_page'
	);
}

function al_b2b_set_clinic_decision($user_id, $decision, $actor_user_id) {
	$user_id = (int) $user_id;
	$actor_user_id = (int) $actor_user_id;
	if ($user_id <= 0) {
		return false;
	}

	$user = get_user_by('id', $user_id);
	if (!$user) {
		return false;
	}

	$account_type = get_user_meta($user_id, AL_B2B_ACCOUNT_TYPE_META, true);
	if ($account_type !== 'clinic') {
		return false;
	}

	$old_role = isset($user->roles[0]) ? (string) $user->roles[0] : '';
	$old_status = (string) get_user_meta($user_id, AL_B2B_CLINIC_STATUS_META, true);

	if ($decision === 'approve') {
		al_b2b_ensure_roles();
		$user->set_role('wholesale_customer');
		update_user_meta($user_id, AL_B2B_CLINIC_STATUS_META, 'approved');

		al_b2b_log_audit_event(
			'clinic_approved',
			$user_id,
			$actor_user_id,
			array(
				'from_role' => $old_role,
				'to_role' => 'wholesale_customer',
				'from_status' => $old_status,
				'to_status' => 'approved',
			)
		);

		return true;
	}

	if ($decision === 'reject') {
		$reject_role = get_role('customer') ? 'customer' : 'subscriber';
		$user->set_role($reject_role);
		update_user_meta($user_id, AL_B2B_CLINIC_STATUS_META, 'rejected');

		al_b2b_log_audit_event(
			'clinic_rejected',
			$user_id,
			$actor_user_id,
			array(
				'from_role' => $old_role,
				'to_role' => $reject_role,
				'from_status' => $old_status,
				'to_status' => 'rejected',
			)
		);

		return true;
	}

	return false;
}

function al_b2b_handle_admin_actions() {
	if (!is_admin() || !current_user_can('promote_users')) {
		return;
	}

	if (!isset($_POST['al_b2b_admin_action'])) {
		return;
	}

	$admin_action = sanitize_key(wp_unslash($_POST['al_b2b_admin_action']));
	$allowed_actions = array(
		'clinic_decision',
		'newsletter_update_status',
		'newsletter_resync',
		'newsletter_delete',
	);
	if (!in_array($admin_action, $allowed_actions, true)) {
		return;
	}

	check_admin_referer(AL_B2B_ADMIN_NONCE_ACTION);
	$actor_user_id = get_current_user_id();

	if ($admin_action === 'clinic_decision') {
		$decision = isset($_POST['decision']) ? sanitize_key(wp_unslash($_POST['decision'])) : '';
		$user_id = isset($_POST['user_id']) ? (int) $_POST['user_id'] : 0;

		if (!in_array($decision, array('approve', 'reject'), true) || $user_id <= 0) {
			return;
		}

		$success = al_b2b_set_clinic_decision($user_id, $decision, $actor_user_id);
		$redirect = add_query_arg(
			array(
				'page' => 'al-b2b-clinic-applications',
				'al_b2b_notice' => $success ? 'updated' : 'failed',
			),
			admin_url('users.php')
		);

		wp_safe_redirect($redirect);
		exit;
	}

	if ($admin_action === 'newsletter_update_status') {
		$email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
		$status = isset($_POST['status']) ? sanitize_key(wp_unslash($_POST['status'])) : '';
		$success = al_b2b_set_newsletter_status($email, $status);
		$redirect = add_query_arg(
			array(
				'page' => 'al-b2b-marketing-reviews',
				'al_b2b_notice' => $success ? 'newsletter_updated' : 'newsletter_failed',
			),
			admin_url('users.php')
		);
		wp_safe_redirect($redirect);
		exit;
	}

	if ($admin_action === 'newsletter_resync') {
		$email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
		$success = al_b2b_resync_newsletter_subscriber($email);
		$redirect = add_query_arg(
			array(
				'page' => 'al-b2b-marketing-reviews',
				'al_b2b_notice' => $success ? 'newsletter_synced' : 'newsletter_failed',
			),
			admin_url('users.php')
		);
		wp_safe_redirect($redirect);
		exit;
	}

	if ($admin_action === 'newsletter_delete') {
		$email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
		$success = al_b2b_delete_newsletter_subscriber($email);
		$redirect = add_query_arg(
			array(
				'page' => 'al-b2b-marketing-reviews',
				'al_b2b_notice' => $success ? 'newsletter_deleted' : 'newsletter_failed',
			),
			admin_url('users.php')
		);
		wp_safe_redirect($redirect);
		exit;
	}

}

function al_b2b_get_newsletter_subscribers($limit = 50) {
	global $wpdb;

	$table = al_b2b_get_newsletter_table_name();
	$limit = max(1, min(200, (int) $limit));
	if (!al_b2b_table_exists($table)) {
		return array();
	}

	$rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->prepare(
			"SELECT email, source, customer_type, region, status, updated_at
			 FROM {$table}
			 ORDER BY updated_at DESC
			 LIMIT %d",
			$limit
		),
		ARRAY_A
	);
	return is_array($rows) ? $rows : array();
}

function al_b2b_get_newsletter_subscriber($email) {
	global $wpdb;

	$email = sanitize_email((string) $email);
	if (!$email || !is_email($email)) {
		return null;
	}

	$table = al_b2b_get_newsletter_table_name();
	if (!al_b2b_table_exists($table)) {
		return null;
	}

	$row = $wpdb->get_row( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->prepare(
			"SELECT email, source, customer_type, region, status FROM {$table} WHERE email = %s LIMIT 1",
			strtolower($email)
		),
		ARRAY_A
	);

	return is_array($row) ? $row : null;
}

function al_b2b_set_newsletter_status($email, $status) {
	$email = sanitize_email((string) $email);
	if (!$email || !is_email($email)) {
		return false;
	}

	$status = al_b2b_normalize_newsletter_status($status);
	$current = al_b2b_get_newsletter_subscriber($email);
	if (!$current) {
		return false;
	}

	return al_b2b_upsert_newsletter_subscriber($email, (string) $current['source'], $status, array(
		'customer_type' => isset($current['customer_type']) ? $current['customer_type'] : '',
		'region' => isset($current['region']) ? $current['region'] : '',
	));
}

function al_b2b_delete_newsletter_subscriber($email) {
	global $wpdb;

	$email = sanitize_email((string) $email);
	if (!$email || !is_email($email)) {
		return false;
	}

	$table = al_b2b_get_newsletter_table_name();
	if (!al_b2b_table_exists($table)) {
		return false;
	}

	$deleted = $wpdb->delete( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$table,
		array('email' => strtolower($email)),
		array('%s')
	);

	return $deleted !== false;
}

function al_b2b_resync_newsletter_subscriber($email) {
	$row = al_b2b_get_newsletter_subscriber($email);
	if (!$row) {
		return false;
	}

	$email = isset($row['email']) ? sanitize_email((string) $row['email']) : '';
	if (!$email || !is_email($email)) {
		return false;
	}

	$sync = al_b2b_sync_newsletter_to_brevo($email, (string) $row['source'], array(
		'customer_type' => isset($row['customer_type']) ? $row['customer_type'] : '',
		'region' => isset($row['region']) ? $row['region'] : '',
	));

	return !empty($sync['ok']);
}

function al_b2b_get_recent_audit_logs($limit = 25) {
	global $wpdb;

	$table = al_b2b_get_audit_table_name();
	$limit = max(1, (int) $limit);

	$rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->prepare(
			"SELECT id, action, target_user_id, actor_user_id, ip_address, details, created_at
			 FROM {$table}
			 ORDER BY id DESC
			 LIMIT %d",
			$limit
		)
	);

	return is_array($rows) ? $rows : array();
}

function al_b2b_table_exists($table_name) {
	global $wpdb;

	$table_name = (string) $table_name;
	if ($table_name === '') {
		return false;
	}

	$found = $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->prepare('SHOW TABLES LIKE %s', $table_name)
	);

	return is_string($found) && $found === $table_name;
}

function al_b2b_get_newsletter_admin_snapshot() {
	global $wpdb;

	$newsletter_table = al_b2b_get_newsletter_table_name();
	$events_table = al_b2b_get_marketing_event_table_name();

	$empty = array(
		'newsletter_table_ready' => false,
		'events_table_ready' => false,
		'status_counts' => array(),
		'recent_subscribers' => array(),
		'recent_events' => array(),
	);

	if (!al_b2b_table_exists($newsletter_table)) {
		return $empty;
	}

	$empty['newsletter_table_ready'] = true;
	$status_rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		"SELECT status, COUNT(*) AS total
		 FROM {$newsletter_table}
		 GROUP BY status
		 ORDER BY total DESC",
		ARRAY_A
	);
	$status_counts = array();
	if (is_array($status_rows)) {
		foreach ($status_rows as $row) {
			$status = isset($row['status']) ? sanitize_key((string) $row['status']) : '';
			$total = isset($row['total']) ? (int) $row['total'] : 0;
			if ($status) {
				$status_counts[$status] = $total;
			}
		}
	}
	$empty['status_counts'] = $status_counts;

	$recent_subscribers = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		"SELECT email, source, customer_type, region, status, updated_at
		 FROM {$newsletter_table}
		 ORDER BY updated_at DESC
		 LIMIT 10",
		ARRAY_A
	);
	$empty['recent_subscribers'] = is_array($recent_subscribers) ? $recent_subscribers : array();

	if (al_b2b_table_exists($events_table)) {
		$empty['events_table_ready'] = true;
		$recent_events = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			"SELECT event_name, email, source, customer_type, region, occurred_at
			 FROM {$events_table}
			 ORDER BY id DESC
			 LIMIT 12",
			ARRAY_A
		);
		$empty['recent_events'] = is_array($recent_events) ? $recent_events : array();
	}

	return $empty;
}

function al_b2b_render_clinic_applications_page() {
	if (!current_user_can('promote_users')) {
		wp_die('Insufficient permissions.');
	}

	$pending_users = get_users(array(
		'role' => 'clinic_pending',
		'meta_key' => AL_B2B_ACCOUNT_TYPE_META,
		'meta_value' => 'clinic',
		'orderby' => 'registered',
		'order' => 'DESC',
	));

	$audit_logs = al_b2b_get_recent_audit_logs();
	$marketing_snapshot = al_b2b_get_newsletter_admin_snapshot();
	$notice = isset($_GET['al_b2b_notice']) ? sanitize_key(wp_unslash($_GET['al_b2b_notice'])) : '';
	$brevo_api_key_ready = (bool) al_b2b_get_brevo_api_key();
	$brevo_list_ready = al_b2b_get_brevo_list_id() > 0;
	$brevo_webhook_secret_ready = (bool) al_b2b_get_brevo_webhook_secret();
	$newsletter_rest_url = rest_url('aesthetics-link/v1/newsletter/subscribe');
	$webhook_rest_url = rest_url('aesthetics-link/v1/newsletter/webhook');
	?>
	<div class="wrap">
		<h1>Clinic Applications</h1>
		<p>Review clinic registrations and approve or reject wholesale access.</p>
		<p><a class="button" href="<?php echo esc_url(admin_url('users.php?page=al-b2b-marketing-reviews')); ?>">Open Marketing Controls</a></p>
		<?php if ($notice === 'updated') : ?>
			<div class="notice notice-success is-dismissible"><p>Clinic account updated.</p></div>
		<?php elseif ($notice === 'failed') : ?>
			<div class="notice notice-error is-dismissible"><p>Unable to update the selected user.</p></div>
		<?php endif; ?>

		<?php if (empty($pending_users)) : ?>
			<p>No pending clinic applications.</p>
		<?php else : ?>
			<table class="widefat striped" style="margin-top: 1rem;">
				<thead>
					<tr>
						<th>User</th>
						<th>Email</th>
						<th>Business Details</th>
						<th>Registered</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($pending_users as $pending_user) : ?>
						<?php
						$business = get_user_meta($pending_user->ID, AL_B2B_BUSINESS_INFO_META, true);
						if (!is_array($business)) {
							$business = array();
						}
						$clinic_name = isset($business['clinicName']) ? $business['clinicName'] : '';
						$business_name = isset($business['businessName']) ? $business['businessName'] : '';
						$license_number = isset($business['licenseNumber']) ? $business['licenseNumber'] : '';
						$tax_id = isset($business['taxId']) ? $business['taxId'] : '';
						$website = isset($business['website']) ? $business['website'] : '';
						$phone = isset($business['phone']) ? $business['phone'] : '';
						?>
						<tr>
							<td>
								<strong><?php echo esc_html($pending_user->display_name); ?></strong><br />
								<small>ID: <?php echo (int) $pending_user->ID; ?></small>
							</td>
							<td><?php echo esc_html($pending_user->user_email); ?></td>
							<td>
								<?php if ($clinic_name) : ?><div>Clinic: <?php echo esc_html($clinic_name); ?></div><?php endif; ?>
								<?php if ($business_name) : ?><div>Business: <?php echo esc_html($business_name); ?></div><?php endif; ?>
								<?php if ($license_number) : ?><div>License: <?php echo esc_html($license_number); ?></div><?php endif; ?>
								<?php if ($tax_id) : ?><div>Tax/VAT: <?php echo esc_html($tax_id); ?></div><?php endif; ?>
								<?php if ($website) : ?>
									<div>
										Website:
										<a href="<?php echo esc_url($website); ?>" target="_blank" rel="noopener noreferrer">
											<?php echo esc_html($website); ?>
										</a>
									</div>
								<?php endif; ?>
								<?php if ($phone) : ?><div>Phone: <?php echo esc_html($phone); ?></div><?php endif; ?>
							</td>
							<td><?php echo esc_html(mysql2date('Y-m-d H:i', $pending_user->user_registered)); ?></td>
							<td>
								<form method="post" style="display:inline-block; margin-right: 0.5rem;">
									<?php wp_nonce_field(AL_B2B_ADMIN_NONCE_ACTION); ?>
									<input type="hidden" name="al_b2b_admin_action" value="clinic_decision" />
									<input type="hidden" name="decision" value="approve" />
									<input type="hidden" name="user_id" value="<?php echo (int) $pending_user->ID; ?>" />
									<button type="submit" class="button button-primary">Approve</button>
								</form>
								<form method="post" style="display:inline-block;">
									<?php wp_nonce_field(AL_B2B_ADMIN_NONCE_ACTION); ?>
									<input type="hidden" name="al_b2b_admin_action" value="clinic_decision" />
									<input type="hidden" name="decision" value="reject" />
									<input type="hidden" name="user_id" value="<?php echo (int) $pending_user->ID; ?>" />
									<button type="submit" class="button">Reject</button>
								</form>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>

		<h2 style="margin-top: 2rem;">Recent Approval Actions</h2>
		<?php if (empty($audit_logs)) : ?>
			<p>No audit events yet.</p>
		<?php else : ?>
			<table class="widefat striped" style="margin-top: 0.75rem;">
				<thead>
					<tr>
						<th>When (UTC)</th>
						<th>Action</th>
						<th>Target User</th>
						<th>Actor</th>
						<th>IP</th>
						<th>Details</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($audit_logs as $log) : ?>
						<?php
						$details = json_decode((string) $log->details, true);
						$details_text = is_array($details) ? wp_json_encode($details) : '';
						?>
						<tr>
							<td><?php echo esc_html((string) $log->created_at); ?></td>
							<td><?php echo esc_html((string) $log->action); ?></td>
							<td><?php echo (int) $log->target_user_id; ?></td>
							<td><?php echo (int) $log->actor_user_id; ?></td>
							<td><?php echo esc_html((string) $log->ip_address); ?></td>
							<td><code><?php echo esc_html($details_text); ?></code></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>

		<h2 style="margin-top: 2rem;">Newsletter &amp; Marketing</h2>
		<p style="max-width: 900px;">
			Current integration status and latest activity across newsletter subscribers and marketing events.
		</p>
		<table class="widefat striped" style="margin-top: 0.75rem; max-width: 960px;">
			<tbody>
				<tr>
					<th style="width: 240px;">Brevo API Key</th>
					<td><?php echo $brevo_api_key_ready ? '<span style="color:#1d7f2c;">Configured</span>' : '<span style="color:#b32d2e;">Missing</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
				</tr>
				<tr>
					<th>Brevo List ID</th>
					<td><?php echo $brevo_list_ready ? '<span style="color:#1d7f2c;">Configured</span>' : '<span style="color:#b32d2e;">Missing</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
				</tr>
				<tr>
					<th>Webhook Secret</th>
					<td><?php echo $brevo_webhook_secret_ready ? '<span style="color:#1d7f2c;">Configured</span>' : '<span style="color:#b32d2e;">Missing (optional)</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></td>
				</tr>
				<tr>
					<th>Subscribe Endpoint</th>
					<td><code><?php echo esc_html($newsletter_rest_url); ?></code></td>
				</tr>
				<tr>
					<th>Webhook Endpoint</th>
					<td><code><?php echo esc_html($webhook_rest_url); ?></code></td>
				</tr>
			</tbody>
		</table>

		<h3 style="margin-top: 1.5rem;">Subscriber Status Counts</h3>
		<?php if (empty($marketing_snapshot['newsletter_table_ready'])) : ?>
			<p>Newsletter table not detected yet. Deactivate and reactivate the plugin once to create/update tables.</p>
		<?php elseif (empty($marketing_snapshot['status_counts'])) : ?>
			<p>No subscriber records yet.</p>
		<?php else : ?>
			<table class="widefat striped" style="margin-top: 0.5rem; max-width: 560px;">
				<thead>
					<tr>
						<th>Status</th>
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($marketing_snapshot['status_counts'] as $status => $count) : ?>
						<tr>
							<td><?php echo esc_html((string) $status); ?></td>
							<td><?php echo (int) $count; ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>

		<h3 style="margin-top: 1.5rem;">Recent Subscribers</h3>
		<?php if (empty($marketing_snapshot['recent_subscribers'])) : ?>
			<p>No recent subscriber updates yet.</p>
		<?php else : ?>
			<table class="widefat striped" style="margin-top: 0.5rem;">
				<thead>
					<tr>
						<th>Email</th>
						<th>Source</th>
						<th>Customer Type</th>
						<th>Region</th>
						<th>Status</th>
						<th>Updated (UTC)</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($marketing_snapshot['recent_subscribers'] as $row) : ?>
						<tr>
							<td><?php echo esc_html(isset($row['email']) ? (string) $row['email'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['source']) ? (string) $row['source'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['customer_type']) ? (string) $row['customer_type'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['region']) ? (string) $row['region'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['status']) ? (string) $row['status'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['updated_at']) ? (string) $row['updated_at'] : ''); ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>

		<h3 style="margin-top: 1.5rem;">Recent Marketing Events</h3>
		<?php if (empty($marketing_snapshot['events_table_ready'])) : ?>
			<p>Marketing events table not detected yet. Deactivate and reactivate the plugin once to create/update tables.</p>
		<?php elseif (empty($marketing_snapshot['recent_events'])) : ?>
			<p>No events tracked yet.</p>
		<?php else : ?>
			<table class="widefat striped" style="margin-top: 0.5rem;">
				<thead>
					<tr>
						<th>When (UTC)</th>
						<th>Event</th>
						<th>Email</th>
						<th>Source</th>
						<th>Customer Type</th>
						<th>Region</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($marketing_snapshot['recent_events'] as $row) : ?>
						<tr>
							<td><?php echo esc_html(isset($row['occurred_at']) ? (string) $row['occurred_at'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['event_name']) ? (string) $row['event_name'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['email']) ? (string) $row['email'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['source']) ? (string) $row['source'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['customer_type']) ? (string) $row['customer_type'] : ''); ?></td>
							<td><?php echo esc_html(isset($row['region']) ? (string) $row['region'] : ''); ?></td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>
	</div>
	<?php
}

function al_b2b_render_marketing_reviews_page() {
	if (!current_user_can('promote_users')) {
		wp_die('Insufficient permissions.');
	}

	$notice = isset($_GET['al_b2b_notice']) ? sanitize_key(wp_unslash($_GET['al_b2b_notice'])) : '';
	$subscribers = al_b2b_get_newsletter_subscribers(60);
	?>
	<div class="wrap">
		<h1>Marketing Controls</h1>
		<p>Manage newsletter subscribers and Brevo sync from one place.</p>

		<?php if ($notice === 'newsletter_updated') : ?>
			<div class="notice notice-success is-dismissible"><p>Subscriber status updated.</p></div>
		<?php elseif ($notice === 'newsletter_synced') : ?>
			<div class="notice notice-success is-dismissible"><p>Subscriber synced to Brevo.</p></div>
		<?php elseif ($notice === 'newsletter_deleted') : ?>
			<div class="notice notice-success is-dismissible"><p>Subscriber deleted.</p></div>
		<?php elseif ($notice === 'newsletter_failed') : ?>
			<div class="notice notice-error is-dismissible"><p>Action failed. Check values and try again.</p></div>
		<?php endif; ?>

		<h2 style="margin-top: 1.5rem;">Newsletter Subscribers</h2>
		<?php if (empty($subscribers)) : ?>
			<p>No subscriber records found.</p>
		<?php else : ?>
			<table class="widefat striped" style="margin-top: 0.75rem;">
				<thead>
					<tr>
						<th>Email</th>
						<th>Source</th>
						<th>Type</th>
						<th>Region</th>
						<th>Status</th>
						<th>Updated (UTC)</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ($subscribers as $subscriber) : ?>
						<?php
						$email = isset($subscriber['email']) ? (string) $subscriber['email'] : '';
						$status = isset($subscriber['status']) ? (string) $subscriber['status'] : 'subscribed';
						?>
						<tr>
							<td><?php echo esc_html($email); ?></td>
							<td><?php echo esc_html(isset($subscriber['source']) ? (string) $subscriber['source'] : ''); ?></td>
							<td><?php echo esc_html(isset($subscriber['customer_type']) ? (string) $subscriber['customer_type'] : ''); ?></td>
							<td><?php echo esc_html(isset($subscriber['region']) ? (string) $subscriber['region'] : ''); ?></td>
							<td><?php echo esc_html($status); ?></td>
							<td><?php echo esc_html(isset($subscriber['updated_at']) ? (string) $subscriber['updated_at'] : ''); ?></td>
							<td>
								<form method="post" style="display:inline-flex; align-items:center; gap:0.5rem; margin-right:0.5rem;">
									<?php wp_nonce_field(AL_B2B_ADMIN_NONCE_ACTION); ?>
									<input type="hidden" name="al_b2b_admin_action" value="newsletter_update_status" />
									<input type="hidden" name="email" value="<?php echo esc_attr($email); ?>" />
									<select name="status">
										<?php foreach (array('subscribed', 'pending', 'unsubscribed', 'bounced', 'complained', 'invalid') as $option) : ?>
											<option value="<?php echo esc_attr($option); ?>" <?php selected($status, $option); ?>>
												<?php echo esc_html($option); ?>
											</option>
										<?php endforeach; ?>
									</select>
									<button type="submit" class="button">Update</button>
								</form>
								<form method="post" style="display:inline-block; margin-right:0.5rem;">
									<?php wp_nonce_field(AL_B2B_ADMIN_NONCE_ACTION); ?>
									<input type="hidden" name="al_b2b_admin_action" value="newsletter_resync" />
									<input type="hidden" name="email" value="<?php echo esc_attr($email); ?>" />
									<button type="submit" class="button button-secondary">Resync</button>
								</form>
								<form method="post" style="display:inline-block;" onsubmit="return confirm('Delete this subscriber record?');">
									<?php wp_nonce_field(AL_B2B_ADMIN_NONCE_ACTION); ?>
									<input type="hidden" name="al_b2b_admin_action" value="newsletter_delete" />
									<input type="hidden" name="email" value="<?php echo esc_attr($email); ?>" />
									<button type="submit" class="button">Delete</button>
								</form>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>

		<h2 style="margin-top: 2rem;">Review Moderation</h2>
		<p>Use WooCommerce native review tools at <a href="<?php echo esc_url(admin_url('edit-comments.php?comment_type=review')); ?>">Comments &rarr; Reviews</a>.</p>
	</div>
	<?php
}

function al_b2b_register_routes() {
	// Auth routes (12) registered by AL_B2B_Auth_Controller via its own
	// rest_api_init callback. /auth/wholesale-prices migrates to the
	// Wholesale_Pricing module in 3d.2.

	register_rest_route('aesthetics-link/v1', '/auth/wholesale-prices', array(
		'methods' => 'GET',
		'callback' => 'al_b2b_get_wholesale_prices',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/orders/lookup', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_lookup_guest_order',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/checkout/bridge', array(
		'methods' => 'GET',
		'callback' => 'al_b2b_rest_checkout_bridge',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/orders/confirmation', array(
		'methods' => 'GET',
		'callback' => 'al_b2b_get_order_confirmation',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/newsletter/subscribe', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_subscribe_newsletter',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/newsletter/webhook', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_handle_brevo_webhook',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/marketing/track', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_track_marketing_event',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/products/reviews', array(
		'methods' => 'GET',
		'callback' => 'al_b2b_get_product_reviews',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/products/reviews', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_submit_product_review',
		'permission_callback' => '__return_true',
	));
}

function al_b2b_register_user($request) {
	al_b2b_ensure_roles();

	$limit = al_b2b_guard_rate_limit('register', 8, HOUR_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$captcha = al_b2b_assert_captcha($body);
	if (is_wp_error($captcha)) {
		return $captcha;
	}

	$email = isset($body['email']) ? sanitize_email($body['email']) : '';
	$password = isset($body['password']) ? (string) $body['password'] : '';
	$first_name = isset($body['firstName']) ? sanitize_text_field($body['firstName']) : '';
	$last_name = isset($body['lastName']) ? sanitize_text_field($body['lastName']) : '';
	$account_type = al_b2b_normalize_account_type(isset($body['accountType']) ? $body['accountType'] : 'retail');
	$marketing_opt_in = !empty($body['marketingOptIn']);
	$business_info = al_b2b_get_business_info_from_payload($body);

	if (!$email || !is_email($email)) {
		return new WP_Error('invalid_email', 'A valid email is required.', array('status' => 400));
	}

	if (strlen($password) < 8) {
		return new WP_Error('invalid_password', 'Password must be at least 8 characters.', array('status' => 400));
	}

	if (!$first_name || !$last_name) {
		return new WP_Error('invalid_name', 'First and last name are required.', array('status' => 400));
	}

	if (email_exists($email)) {
		return new WP_Error('email_exists', 'An account with this email already exists.', array('status' => 409));
	}

	if ($account_type === 'clinic') {
		if (!$business_info['clinicName'] || !$business_info['businessName'] || !$business_info['licenseNumber']) {
			return new WP_Error(
				'invalid_business_info',
				'Clinic name, business name, and license number are required for clinic applications.',
				array('status' => 400)
			);
		}
	}

	$username = al_b2b_derive_username_from_email($email);
	$retail_role = get_role('customer') ? 'customer' : 'subscriber';
	$role = $account_type === 'clinic' ? 'clinic_pending' : $retail_role;

	$user_id = wp_insert_user(array(
		'user_login' => $username,
		'user_pass' => $password,
		'user_email' => $email,
		'first_name' => $first_name,
		'last_name' => $last_name,
		'display_name' => trim($first_name . ' ' . $last_name),
		'role' => $role,
	));

	if (is_wp_error($user_id)) {
		$error_code = $user_id->get_error_code() ?: 'registration_failed';
		$status = in_array($error_code, array('invalid_username', 'existing_user_login', 'existing_user_email', 'invalid_role'), true)
			? 400
			: 500;

		return new WP_Error($error_code, $user_id->get_error_message(), array('status' => $status));
	}

	update_user_meta($user_id, AL_B2B_ACCOUNT_TYPE_META, $account_type);
	update_user_meta($user_id, AL_B2B_CLINIC_STATUS_META, $account_type === 'clinic' ? 'pending' : 'approved');
	update_user_meta($user_id, AL_B2B_BUSINESS_INFO_META, $business_info);
	update_user_meta($user_id, AL_B2B_EMAIL_VERIFIED_META, $account_type === 'clinic' ? 0 : 1);

	$user = get_user_by('id', $user_id);
	$is_clinic_account = $account_type === 'clinic';
	$email_sent = false;
	$session_token = '';

	if ($is_clinic_account) {
		$email_sent = al_b2b_send_verification_email($user);
	} else {
		$session_token = (string) al_b2b_issue_session($user_id);
	}

	if ($marketing_opt_in && $email && is_email($email)) {
		$customer_type = $account_type === 'clinic' ? 'clinic' : 'retail';
		al_b2b_upsert_newsletter_subscriber($email, 'signup', 'subscribed', array(
			'customer_type' => $customer_type,
			'region' => '',
			'last_event_at' => gmdate('Y-m-d H:i:s'),
			'attributes' => array(
				'source' => 'signup',
				'customer_type' => $customer_type,
			),
		));
		al_b2b_record_marketing_event('signup_opt_in', $email, array(
			'user_id' => (int) $user_id,
			'source' => 'signup',
			'customer_type' => $customer_type,
			'payload' => array(
				'account_type' => $account_type,
			),
		));
		al_b2b_sync_newsletter_to_brevo($email, 'signup', array(
			'customer_type' => $customer_type,
			'attributes' => array(
				'NEWSLETTER_OPT_IN' => true,
			),
		));
	}

	return rest_ensure_response(array(
		'user' => al_b2b_map_user($user),
		'requiresApproval' => $is_clinic_account,
		'emailDeliveryAttempted' => $is_clinic_account ? $email_sent : false,
		'session_token' => $session_token,
		'message' => $is_clinic_account
			? 'Clinic account created. Please check your inbox to verify your email.'
			: 'Account created and signed in.',
	));
}

function al_b2b_login_user($request) {
	$limit = al_b2b_guard_rate_limit('login', 12, 15 * MINUTE_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$captcha = al_b2b_assert_captcha($body);
	if (is_wp_error($captcha)) {
		return $captcha;
	}

	$email = isset($body['email']) ? sanitize_email($body['email']) : '';
	$password = isset($body['password']) ? (string) $body['password'] : '';

	if (!$email || !$password) {
		return new WP_Error('invalid_credentials', 'Email and password are required.', array('status' => 400));
	}

	$user = wp_authenticate($email, $password);
	if (is_wp_error($user)) {
		return new WP_Error('invalid_credentials', 'Invalid email or password.', array('status' => 401));
	}

	$account_type = get_user_meta($user->ID, AL_B2B_ACCOUNT_TYPE_META, true);
	$is_clinic_account = $account_type === 'clinic';

	if ($is_clinic_account && !al_b2b_is_email_verified($user->ID)) {
		return new WP_Error(
			'email_not_verified',
			'Please verify your email before signing in to your clinic account.',
			array(
				'status' => 403,
				'needsVerification' => true,
			)
		);
	}

	$token = al_b2b_issue_session($user->ID);
	if (!$token) {
		return new WP_Error('session_issue_failed', 'Unable to start session.', array('status' => 500));
	}

	$mapped = al_b2b_map_user($user);

	return rest_ensure_response(array(
		'user' => $mapped,
		'session_token' => $token,
		'requiresApproval' => $mapped['accountType'] === 'clinic' && $mapped['clinicStatus'] !== 'approved',
		'message' => 'Signed in.',
	));
}

function al_b2b_get_me($request) {
	$user = al_b2b_authenticate_request($request);
	if (is_wp_error($user)) {
		return $user;
	}

	return rest_ensure_response(array(
		'user' => al_b2b_map_user($user),
	));
}

function al_b2b_logout_user($request) {
	$token = al_b2b_parse_bearer_token($request);
	if (!$token) {
		return new WP_Error('unauthorized', 'Not authenticated.', array('status' => 401));
	}

	al_b2b_delete_session($token);
	return rest_ensure_response(array('ok' => true));
}

function al_b2b_request_email_verification($request) {
	$limit = al_b2b_guard_rate_limit('request_email_verification', 8, HOUR_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$captcha = al_b2b_assert_captcha($body);
	if (is_wp_error($captcha)) {
		return $captcha;
	}

	$email = isset($body['email']) ? sanitize_email($body['email']) : '';
	if ($email && is_email($email)) {
		$user = get_user_by('email', $email);
		$is_clinic_account = $user && get_user_meta($user->ID, AL_B2B_ACCOUNT_TYPE_META, true) === 'clinic';
		if ($is_clinic_account && !al_b2b_is_email_verified($user->ID)) {
			al_b2b_send_verification_email($user);
		}
	}

	return rest_ensure_response(array(
		'ok' => true,
		'message' => 'If an account exists for that email, a verification link has been sent.',
	));
}

function al_b2b_verify_email($request) {
	$limit = al_b2b_guard_rate_limit('verify_email', 30, HOUR_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$token = isset($body['token']) ? sanitize_text_field((string) $body['token']) : '';

	if (!$token) {
		return new WP_Error('invalid_token', 'Verification token is required.', array('status' => 400));
	}

	$user = al_b2b_get_user_from_one_time_token(
		$token,
		'email_verify',
		AL_B2B_EMAIL_VERIFY_HASH_META,
		AL_B2B_EMAIL_VERIFY_EXPIRES_META
	);

	if (!$user) {
		return new WP_Error('invalid_token', 'Verification link is invalid or expired.', array('status' => 400));
	}

	update_user_meta($user->ID, AL_B2B_EMAIL_VERIFIED_META, 1);
	al_b2b_clear_one_time_token($user->ID, AL_B2B_EMAIL_VERIFY_HASH_META, AL_B2B_EMAIL_VERIFY_EXPIRES_META);

	$session_token = al_b2b_issue_session($user->ID);
	if (!$session_token) {
		return new WP_Error('session_issue_failed', 'Email verified, but session could not be started. Please sign in.', array('status' => 500));
	}

	return rest_ensure_response(array(
		'ok' => true,
		'user' => al_b2b_map_user($user),
		'session_token' => $session_token,
		'message' => 'Email verified successfully.',
	));
}

function al_b2b_request_password_reset($request) {
	$limit = al_b2b_guard_rate_limit('request_password_reset', 8, HOUR_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$captcha = al_b2b_assert_captcha($body);
	if (is_wp_error($captcha)) {
		return $captcha;
	}

	$email = isset($body['email']) ? sanitize_email($body['email']) : '';
	if ($email && is_email($email)) {
		$user = get_user_by('email', $email);
		if ($user) {
			al_b2b_send_password_reset_email($user);
		}
	}

	return rest_ensure_response(array(
		'ok' => true,
		'message' => 'If an account exists for that email, a password reset link has been sent.',
	));
}

function al_b2b_reset_password($request) {
	$limit = al_b2b_guard_rate_limit('reset_password', 15, HOUR_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$captcha = al_b2b_assert_captcha($body);
	if (is_wp_error($captcha)) {
		return $captcha;
	}

	$token = isset($body['token']) ? sanitize_text_field((string) $body['token']) : '';
	$password = isset($body['password']) ? (string) $body['password'] : '';

	if (!$token) {
		return new WP_Error('invalid_token', 'Reset token is required.', array('status' => 400));
	}

	if (strlen($password) < 8) {
		return new WP_Error('invalid_password', 'Password must be at least 8 characters.', array('status' => 400));
	}

	$user = al_b2b_get_user_from_one_time_token(
		$token,
		'password_reset',
		AL_B2B_PASSWORD_RESET_HASH_META,
		AL_B2B_PASSWORD_RESET_EXPIRES_META
	);

	if (!$user) {
		return new WP_Error('invalid_token', 'Reset link is invalid or expired.', array('status' => 400));
	}

	wp_set_password($password, $user->ID);
	al_b2b_clear_one_time_token($user->ID, AL_B2B_PASSWORD_RESET_HASH_META, AL_B2B_PASSWORD_RESET_EXPIRES_META);
	al_b2b_delete_sessions_for_user($user->ID);

	return rest_ensure_response(array(
		'ok' => true,
		'message' => 'Password reset successfully. Please sign in with your new password.',
	));
}

function al_b2b_normalize_newsletter_status($status) {
	$status = sanitize_key((string) $status);
	$allowed = array(
		'pending',
		'subscribed',
		'unsubscribed',
		'bounced',
		'complained',
		'invalid',
	);

	if (!in_array($status, $allowed, true)) {
		return 'subscribed';
	}

	return $status;
}

function al_b2b_normalize_customer_type($value) {
	$value = sanitize_key((string) $value);
	if (in_array($value, array('retail', 'clinic', 'wholesale', 'guest'), true)) {
		return $value;
	}

	return '';
}

function al_b2b_normalize_region($value) {
	$value = strtoupper(trim((string) $value));
	$value = preg_replace('/[^A-Z0-9-]/', '', $value);
	if (!is_string($value)) {
		return '';
	}

	return substr($value, 0, 16);
}

function al_b2b_merge_attributes($existing, $incoming) {
	$existing = is_array($existing) ? $existing : array();
	$incoming = is_array($incoming) ? $incoming : array();

	return array_merge($existing, $incoming);
}

function al_b2b_upsert_newsletter_subscriber($email, $source, $status = 'subscribed', $meta = array()) {
	global $wpdb;

	$email = sanitize_email((string) $email);
	if (!$email || !is_email($email)) {
		return false;
	}

	$source = sanitize_key((string) $source);
	if (!$source) {
		$source = 'footer';
	}

	$status = al_b2b_normalize_newsletter_status($status);
	$table = al_b2b_get_newsletter_table_name();
	$now = gmdate('Y-m-d H:i:s');
	$meta = is_array($meta) ? $meta : array();
	$customer_type = al_b2b_normalize_customer_type(isset($meta['customer_type']) ? $meta['customer_type'] : '');
	$region = al_b2b_normalize_region(isset($meta['region']) ? $meta['region'] : '');
	$last_event_at = isset($meta['last_event_at']) ? trim((string) $meta['last_event_at']) : '';
	$attributes = isset($meta['attributes']) && is_array($meta['attributes']) ? $meta['attributes'] : array();

	$existing_row = $wpdb->get_row( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->prepare("SELECT attributes FROM {$table} WHERE email = %s LIMIT 1", strtolower($email)),
		ARRAY_A
	);
	$existing_attributes = array();
	if (is_array($existing_row) && isset($existing_row['attributes'])) {
		$decoded = json_decode((string) $existing_row['attributes'], true);
		$existing_attributes = is_array($decoded) ? $decoded : array();
	}
	$merged_attributes = al_b2b_merge_attributes($existing_attributes, $attributes);

	$payload = array(
		'email' => strtolower($email),
		'source' => $source,
		'customer_type' => $customer_type,
		'region' => $region,
		'status' => $status,
		'attributes' => wp_json_encode($merged_attributes),
		'ip_address' => al_b2b_get_request_ip(),
		'user_agent' => al_b2b_get_request_user_agent(),
		'updated_at' => $now,
	);

	if ($status === 'subscribed') {
		$payload['subscribed_at'] = $now;
	}
	if ($last_event_at) {
		$payload['last_event_at'] = $last_event_at;
	}

	$formats = array_fill(0, count($payload), '%s');
	$inserted = $wpdb->replace( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$table,
		$payload,
		$formats
	);

	return $inserted !== false;
}

function al_b2b_sync_contact_to_brevo($email, $source, $options = array()) {
	$api_key = al_b2b_get_brevo_api_key();
	$list_id = al_b2b_get_brevo_list_id();
	$options = is_array($options) ? $options : array();
	$attributes = isset($options['attributes']) && is_array($options['attributes']) ? $options['attributes'] : array();
	$include_list = array_key_exists('include_list', $options) ? (bool) $options['include_list'] : true;
	$customer_type = al_b2b_normalize_customer_type(isset($options['customer_type']) ? $options['customer_type'] : '');
	$region = al_b2b_normalize_region(isset($options['region']) ? $options['region'] : '');
	$event_name = sanitize_key((string) (isset($options['event_name']) ? $options['event_name'] : ''));
	$event_time = isset($options['event_time']) ? trim((string) $options['event_time']) : gmdate('c');

	$brevo_attributes = array(
		'SOURCE' => strtoupper((string) $source),
		'LAST_EVENT_AT' => $event_time,
	);
	if ($customer_type) {
		$brevo_attributes['CUSTOMER_TYPE'] = strtoupper($customer_type);
	}
	if ($region) {
		$brevo_attributes['REGION'] = $region;
	}
	if ($event_name) {
		$brevo_attributes['LAST_EVENT'] = strtoupper($event_name);
	}
	$brevo_attributes = array_merge($brevo_attributes, $attributes);

	if (!$api_key || ($include_list && $list_id <= 0)) {
		return array(
			'ok' => false,
			'configured' => false,
			'message' => 'Brevo API key or list id is not configured.',
		);
	}

	$payload = array(
		'email' => (string) $email,
		'updateEnabled' => true,
		'attributes' => $brevo_attributes,
	);
	if ($include_list) {
		$payload['listIds'] = array($list_id);
	}

	$response = wp_remote_post(
		'https://api.brevo.com/v3/contacts',
		array(
			'timeout' => 15,
			'headers' => array(
				'Accept' => 'application/json',
				'Content-Type' => 'application/json',
				'api-key' => $api_key,
			),
			'body' => wp_json_encode($payload),
		)
	);

	if (is_wp_error($response)) {
		return array(
			'ok' => false,
			'configured' => true,
			'message' => $response->get_error_message(),
		);
	}

	$status_code = (int) wp_remote_retrieve_response_code($response);
	if ($status_code >= 200 && $status_code < 300) {
		return array(
			'ok' => true,
			'configured' => true,
			'message' => '',
		);
	}

	$raw_body = wp_remote_retrieve_body($response);
	$decoded = json_decode((string) $raw_body, true);
	$error_message = is_array($decoded) && !empty($decoded['message']) ? (string) $decoded['message'] : '';

	return array(
		'ok' => false,
		'configured' => true,
		'message' => $error_message ? $error_message : 'Brevo contact sync failed.',
	);
}

function al_b2b_sync_newsletter_to_brevo($email, $source, $meta = array()) {
	$meta = is_array($meta) ? $meta : array();
	return al_b2b_sync_contact_to_brevo($email, $source, array(
		'include_list' => true,
		'customer_type' => isset($meta['customer_type']) ? $meta['customer_type'] : '',
		'region' => isset($meta['region']) ? $meta['region'] : '',
		'attributes' => isset($meta['attributes']) ? $meta['attributes'] : array(),
		'event_name' => 'newsletter_subscribed',
		'event_time' => gmdate('c'),
	));
}

function al_b2b_record_marketing_event($event_name, $email = '', $meta = array()) {
	global $wpdb;

	$event_name = sanitize_key((string) $event_name);
	if (!$event_name) {
		return false;
	}

	$email = sanitize_email((string) $email);
	$meta = is_array($meta) ? $meta : array();
	$table = al_b2b_get_marketing_event_table_name();
	$occurred_at = isset($meta['occurred_at']) ? trim((string) $meta['occurred_at']) : gmdate('Y-m-d H:i:s');
	if (!$occurred_at) {
		$occurred_at = gmdate('Y-m-d H:i:s');
	}

	$payload = array(
		'event_name' => $event_name,
		'email' => $email ? strtolower($email) : '',
		'user_id' => isset($meta['user_id']) ? max(0, (int) $meta['user_id']) : 0,
		'source' => sanitize_key((string) (isset($meta['source']) ? $meta['source'] : '')),
		'customer_type' => al_b2b_normalize_customer_type(isset($meta['customer_type']) ? $meta['customer_type'] : ''),
		'region' => al_b2b_normalize_region(isset($meta['region']) ? $meta['region'] : ''),
		'payload' => wp_json_encode(isset($meta['payload']) && is_array($meta['payload']) ? $meta['payload'] : array()),
		'occurred_at' => $occurred_at,
		'ip_address' => al_b2b_get_request_ip(),
		'user_agent' => al_b2b_get_request_user_agent(),
	);

	$result = $wpdb->insert( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$table,
		$payload,
		array('%s', '%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s')
	);

	return $result !== false;
}

function al_b2b_subscribe_newsletter($request) {
	$limit = al_b2b_guard_rate_limit('newsletter_subscribe', 20, 15 * MINUTE_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$email = isset($body['email']) ? sanitize_email((string) $body['email']) : '';
	$source = isset($body['source']) ? sanitize_key((string) $body['source']) : 'footer';
	$customer_type = al_b2b_normalize_customer_type(isset($body['customerType']) ? $body['customerType'] : '');
	$region = al_b2b_normalize_region(isset($body['region']) ? $body['region'] : '');

	if (!$email || !is_email($email)) {
		return new WP_Error('invalid_email', 'A valid email address is required.', array('status' => 400));
	}

	$saved = al_b2b_upsert_newsletter_subscriber($email, $source, 'subscribed', array(
		'customer_type' => $customer_type,
		'region' => $region,
		'last_event_at' => gmdate('Y-m-d H:i:s'),
		'attributes' => array(
			'source' => $source,
			'customer_type' => $customer_type,
			'region' => $region,
		),
	));
	if (!$saved) {
		return new WP_Error('newsletter_save_failed', 'Unable to save newsletter subscription.', array('status' => 500));
	}

	al_b2b_record_marketing_event('newsletter_subscribed', $email, array(
		'source' => $source,
		'customer_type' => $customer_type,
		'region' => $region,
		'payload' => array(
			'source' => $source,
		),
	));

	$brevo_sync = al_b2b_sync_newsletter_to_brevo($email, $source, array(
		'customer_type' => $customer_type,
		'region' => $region,
		'attributes' => array(
			'NEWSLETTER_OPT_IN' => true,
		),
	));

	return rest_ensure_response(array(
		'ok' => true,
		'message' => 'You are subscribed to our newsletter.',
		'brevoSynced' => !empty($brevo_sync['ok']),
		'brevoConfigured' => !empty($brevo_sync['configured']),
	));
}

function al_b2b_validate_brevo_webhook_request($request) {
	$secret = al_b2b_get_brevo_webhook_secret();
	if (!$secret) {
		return true;
	}

	$provided = trim((string) $request->get_header('x-al-brevo-secret'));
	if (!$provided) {
		$provided = isset($_GET['secret']) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			? sanitize_text_field(wp_unslash($_GET['secret'])) // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			: '';
	}

	if (!$provided || !hash_equals($secret, $provided)) {
		return new WP_Error('forbidden', 'Invalid webhook secret.', array('status' => 403));
	}

	return true;
}

function al_b2b_map_brevo_event_to_status($event) {
	$event = sanitize_key((string) $event);

	if (in_array($event, array('unsubscribe', 'unsubscribed'), true)) {
		return 'unsubscribed';
	}
	if (in_array($event, array('hard_bounce', 'soft_bounce', 'bounce'), true)) {
		return 'bounced';
	}
	if (in_array($event, array('spam', 'complaint'), true)) {
		return 'complained';
	}
	if (in_array($event, array('invalid_email', 'blocked', 'error'), true)) {
		return 'invalid';
	}
	if (in_array($event, array('add_contact', 'create_contact', 'update_contact', 'subscribed'), true)) {
		return 'subscribed';
	}
	if (in_array($event, array('opened', 'open', 'unique_opened', 'email_opened'), true)) {
		return 'engaged_open';
	}
	if (in_array($event, array('click', 'clicked', 'unique_clicked', 'email_clicked'), true)) {
		return 'engaged_click';
	}

	return '';
}

function al_b2b_handle_single_brevo_webhook_event($item) {
	if (!is_array($item)) {
		return false;
	}

	$email = isset($item['email']) ? sanitize_email((string) $item['email']) : '';
	$event = isset($item['event']) ? (string) $item['event'] : '';
	$status = al_b2b_map_brevo_event_to_status($event);

	if (!$email || !is_email($email) || !$status) {
		return false;
	}

	if ($status === 'engaged_open' || $status === 'engaged_click') {
		$event_name = $status === 'engaged_click' ? 'email_clicked' : 'email_opened';
		al_b2b_record_marketing_event($event_name, $email, array(
			'source' => 'brevo_webhook',
			'payload' => $item,
			'occurred_at' => gmdate('Y-m-d H:i:s'),
		));
		return al_b2b_upsert_newsletter_subscriber($email, 'brevo_webhook', 'subscribed', array(
			'last_event_at' => gmdate('Y-m-d H:i:s'),
		));
	}

	return al_b2b_upsert_newsletter_subscriber($email, 'brevo_webhook', $status);
}

function al_b2b_handle_brevo_webhook($request) {
	$validation = al_b2b_validate_brevo_webhook_request($request);
	if (is_wp_error($validation)) {
		return $validation;
	}

	$body = $request->get_json_params();
	if (is_array($body) && array_key_exists(0, $body)) {
		$events = $body;
	} elseif (is_array($body)) {
		$events = array($body);
	} else {
		$events = array();
	}

	$handled = 0;
	foreach ($events as $event) {
		if (al_b2b_handle_single_brevo_webhook_event($event)) {
			$handled += 1;
		}
	}

	return rest_ensure_response(array(
		'ok' => true,
		'handled' => $handled,
	));
}

function al_b2b_track_marketing_event($request) {
	$body = al_b2b_get_json_body($request);
	$event_name = isset($body['event']) ? sanitize_key((string) $body['event']) : '';
	$email = isset($body['email']) ? sanitize_email((string) $body['email']) : '';
	$source = isset($body['source']) ? sanitize_key((string) $body['source']) : 'storefront';
	$customer_type = al_b2b_normalize_customer_type(isset($body['customerType']) ? $body['customerType'] : '');
	$region = al_b2b_normalize_region(isset($body['region']) ? $body['region'] : '');
	$payload = isset($body['payload']) && is_array($body['payload']) ? $body['payload'] : array();
	$occurred_at = gmdate('Y-m-d H:i:s');

	if (!$event_name) {
		return new WP_Error('invalid_event', 'A valid event name is required.', array('status' => 400));
	}

	$user_id = get_current_user_id();
	al_b2b_record_marketing_event($event_name, $email, array(
		'user_id' => $user_id,
		'source' => $source,
		'customer_type' => $customer_type,
		'region' => $region,
		'payload' => $payload,
		'occurred_at' => $occurred_at,
	));

	if ($email && is_email($email)) {
		al_b2b_upsert_newsletter_subscriber($email, $source, 'subscribed', array(
			'customer_type' => $customer_type,
			'region' => $region,
			'last_event_at' => $occurred_at,
			'attributes' => array(
				'last_event' => $event_name,
				'source' => $source,
			),
		));

		al_b2b_sync_contact_to_brevo($email, $source, array(
			'include_list' => false,
			'customer_type' => $customer_type,
			'region' => $region,
			'event_name' => $event_name,
			'event_time' => gmdate('c'),
			'attributes' => array(
				'LAST_EVENT_SOURCE' => strtoupper($source),
			),
		));
	}

	return rest_ensure_response(array(
		'ok' => true,
	));
}

function al_b2b_mark_inactive_contacts() {
	global $wpdb;

	$table = al_b2b_get_newsletter_table_name();
	$threshold = gmdate('Y-m-d H:i:s', time() - (30 * DAY_IN_SECONDS));

	$rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->prepare(
			"SELECT email, customer_type, region FROM {$table}
			 WHERE status = %s
			   AND (last_event_at IS NULL OR last_event_at <= %s)
			 LIMIT 500",
			'subscribed',
			$threshold
		),
		ARRAY_A
	);

	if (!is_array($rows) || empty($rows)) {
		return;
	}

	foreach ($rows as $row) {
		$email = isset($row['email']) ? sanitize_email((string) $row['email']) : '';
		if (!$email || !is_email($email)) {
			continue;
		}

		al_b2b_record_marketing_event('inactive_30_days', $email, array(
			'source' => 'cron',
			'customer_type' => isset($row['customer_type']) ? $row['customer_type'] : '',
			'region' => isset($row['region']) ? $row['region'] : '',
			'payload' => array('window_days' => 30),
			'occurred_at' => gmdate('Y-m-d H:i:s'),
		));

		al_b2b_sync_contact_to_brevo($email, 'cron', array(
			'include_list' => false,
			'customer_type' => isset($row['customer_type']) ? $row['customer_type'] : '',
			'region' => isset($row['region']) ? $row['region'] : '',
			'event_name' => 'inactive_30_days',
			'event_time' => gmdate('c'),
			'attributes' => array(
				'INACTIVE_30D' => true,
			),
		));
	}
}

function al_b2b_get_product_reviews($request) {
	$product_id = absint($request->get_param('productId'));
	if ($product_id <= 0) {
		return new WP_Error('invalid_product_id', 'A valid productId is required.', array('status' => 400));
	}

	$product = get_post($product_id);
	if (!$product || $product->post_type !== 'product') {
		return new WP_Error('product_not_found', 'Product not found.', array('status' => 404));
	}

	$comments = get_comments(array(
		'post_id' => $product_id,
		'status' => 'approve',
		'type' => 'review',
		'number' => 100,
		'orderby' => 'comment_date_gmt',
		'order' => 'DESC',
	));

	$distribution = array(0, 0, 0, 0, 0);
	$rating_sum = 0;
	$rating_count = 0;
	$reviews = array();

	foreach ($comments as $comment) {
		if (!$comment instanceof WP_Comment) {
			continue;
		}

		$rating = (int) get_comment_meta($comment->comment_ID, 'rating', true);
		if ($rating < 1 || $rating > 5) {
			continue;
		}

		$rating_sum += $rating;
		$rating_count += 1;
		$distribution_index = 5 - $rating;
		if (isset($distribution[$distribution_index])) {
			$distribution[$distribution_index] += 1;
		}

		$title = (string) get_comment_meta($comment->comment_ID, 'al_review_title', true);
		if (!$title) {
			$excerpt = wp_trim_words(wp_strip_all_tags((string) $comment->comment_content), 10, '');
			$title = $excerpt ? $excerpt : 'Review';
		}

		$verified = false;
		if (function_exists('wc_review_is_from_verified_owner')) {
			$verified = (bool) wc_review_is_from_verified_owner((int) $comment->comment_ID);
		}

		$reviews[] = array(
			'id' => (string) $comment->comment_ID,
			'author' => $comment->comment_author ? $comment->comment_author : 'Anonymous',
			'rating' => $rating,
			'date' => mysql2date('j M Y', $comment->comment_date_gmt ?: $comment->comment_date),
			'title' => $title,
			'body' => (string) $comment->comment_content,
			'verified' => $verified,
		);
	}

	$summary = null;
	if ($rating_count > 0) {
		$summary = array(
			'average' => round($rating_sum / $rating_count, 1),
			'count' => $rating_count,
			'distribution' => $distribution,
		);
	}

	return rest_ensure_response(array(
		'productId' => $product_id,
		'summary' => $summary,
		'reviews' => $reviews,
	));
}

function al_b2b_submit_product_review($request) {
	$limit = al_b2b_guard_rate_limit('submit_product_review', 10, 15 * MINUTE_IN_SECONDS);
	if (is_wp_error($limit)) {
		return $limit;
	}

	$body = al_b2b_get_json_body($request);
	$product_id = isset($body['productId']) ? absint($body['productId']) : 0;
	$rating = isset($body['rating']) ? (int) $body['rating'] : 0;
	$title = isset($body['title']) ? sanitize_text_field((string) $body['title']) : '';
	$content = isset($body['body']) ? wp_kses_post((string) $body['body']) : '';
	$guest_author = isset($body['author']) ? sanitize_text_field((string) $body['author']) : '';
	$guest_email = isset($body['email']) ? sanitize_email((string) $body['email']) : '';

	if ($product_id <= 0) {
		return new WP_Error('invalid_product_id', 'A valid productId is required.', array('status' => 400));
	}
	if ($rating < 1 || $rating > 5) {
		return new WP_Error('invalid_rating', 'Rating must be between 1 and 5.', array('status' => 400));
	}
	if (!$title || !$content) {
		return new WP_Error('invalid_review', 'Review title and content are required.', array('status' => 400));
	}

	$product = get_post($product_id);
	if (!$product || $product->post_type !== 'product') {
		return new WP_Error('product_not_found', 'Product not found.', array('status' => 404));
	}

	$auth_user = al_b2b_authenticate_request($request);
	$user = $auth_user instanceof WP_User ? $auth_user : null;
	$user_id = $user ? (int) $user->ID : 0;

	if (get_option('comment_registration') && !$user) {
		return new WP_Error('auth_required', 'You must be logged in to submit a review.', array('status' => 401));
	}

	$author_name = $user ? $user->display_name : $guest_author;
	$author_email = $user ? $user->user_email : $guest_email;
	if (!$author_name || !$author_email || !is_email($author_email)) {
		return new WP_Error('invalid_author', 'A valid name and email are required.', array('status' => 400));
	}

	if (get_option('woocommerce_review_rating_verification_required') === 'yes') {
		$bought = function_exists('wc_customer_bought_product')
			? wc_customer_bought_product($author_email, $user_id, $product_id)
			: true;
		if (!$bought) {
			return new WP_Error(
				'not_verified_buyer',
				'Only verified buyers can leave a review for this product.',
				array('status' => 403)
			);
		}
	}

	$comment_data = array(
		'comment_post_ID' => $product_id,
		'comment_author' => $author_name,
		'comment_author_email' => $author_email,
		'comment_content' => $content,
		'comment_type' => 'review',
		'comment_parent' => 0,
		'user_id' => $user_id,
		'comment_approved' => 1,
		'comment_author_IP' => al_b2b_get_request_ip(),
		'comment_agent' => al_b2b_get_request_user_agent(),
	);

	$comment_id = wp_new_comment($comment_data, true);
	if (is_wp_error($comment_id)) {
		return new WP_Error('review_submit_failed', $comment_id->get_error_message(), array('status' => 500));
	}

	update_comment_meta($comment_id, 'rating', $rating);
	update_comment_meta($comment_id, 'al_review_title', $title);

	return rest_ensure_response(array(
		'ok' => true,
		'pendingModeration' => false,
		'message' => 'Review submitted successfully.',
	));
}

function al_b2b_normalize_price_number($value) {
	if ($value === '' || $value === null) {
		return null;
	}

	if (!is_numeric($value)) {
		return null;
	}

	return (float) $value;
}

function al_b2b_normalize_price_label($value) {
	$label = wp_strip_all_tags((string) $value);
	$charset = get_bloginfo('charset');
	if (!$charset || !is_string($charset)) {
		$charset = 'UTF-8';
	}

	$label = html_entity_decode($label, ENT_QUOTES | ENT_HTML5, $charset);
	$label = preg_replace('/\s+/u', ' ', $label);

	return is_string($label) ? trim($label) : '';
}

function al_b2b_format_price_range_label($min_price, $max_price, $fallback_price = null) {
	$min_price = al_b2b_normalize_price_number($min_price);
	$max_price = al_b2b_normalize_price_number($max_price);
	$fallback_price = al_b2b_normalize_price_number($fallback_price);

	if ($min_price === null && $max_price === null) {
		if ($fallback_price === null) {
			return '';
		}

		return al_b2b_normalize_price_label(wc_price($fallback_price));
	}

	if ($min_price === null) {
		$min_price = $max_price;
	}
	if ($max_price === null) {
		$max_price = $min_price;
	}

	$min_label = al_b2b_normalize_price_label(wc_price($min_price));
	$max_label = al_b2b_normalize_price_label(wc_price($max_price));

	if ($min_label === '' && $fallback_price !== null) {
		return al_b2b_normalize_price_label(wc_price($fallback_price));
	}

	if ($min_label !== '' && $max_label !== '' && $min_price < $max_price) {
		return "{$min_label} - {$max_label}";
	}

	return $min_label !== '' ? $min_label : $max_label;
}

function al_b2b_get_variable_price_bounds($product, $use_wholesale_prices = false) {
	if (!$product || !is_a($product, 'WC_Product')) {
		return null;
	}

	$is_variable = method_exists($product, 'is_type') && $product->is_type('variable');
	if (!$is_variable) {
		return null;
	}

	$variation_ids = array();
	if (method_exists($product, 'get_visible_children')) {
		$variation_ids = $product->get_visible_children();
	} elseif (method_exists($product, 'get_children')) {
		$variation_ids = $product->get_children();
	}

	if (!is_array($variation_ids) || empty($variation_ids)) {
		return null;
	}

	$min_price = null;
	$max_price = null;
	$min_regular_price = null;
	$max_regular_price = null;
	$has_discount = false;

	foreach ($variation_ids as $variation_id) {
		$variation = wc_get_product((int) $variation_id);
		if (!$variation || !is_a($variation, 'WC_Product_Variation')) {
			continue;
		}

		$current_price = al_b2b_normalize_price_number($variation->get_price('edit'));
		$regular_price = al_b2b_normalize_price_number($variation->get_regular_price('edit'));

		if ($current_price === null && $regular_price === null) {
			continue;
		}

		if ($current_price === null) {
			$current_price = $regular_price;
		}
		if ($regular_price === null) {
			$regular_price = $current_price;
		}

		if ($use_wholesale_prices) {
			$wholesale_data = al_b2b_calculate_wholesale_price_data($variation);
			if (is_array($wholesale_data)) {
				$wholesale_current = isset($wholesale_data['price'])
					? al_b2b_normalize_price_number($wholesale_data['price'])
					: null;
				$wholesale_regular = isset($wholesale_data['regular'])
					? al_b2b_normalize_price_number($wholesale_data['regular'])
					: null;

				if ($wholesale_current !== null) {
					$current_price = $wholesale_current;
				}
				if ($wholesale_regular !== null) {
					$regular_price = $wholesale_regular;
				}
			}
		}

		if ($current_price === null) {
			continue;
		}
		if ($regular_price === null) {
			$regular_price = $current_price;
		}

		$min_price = $min_price === null ? $current_price : min($min_price, $current_price);
		$max_price = $max_price === null ? $current_price : max($max_price, $current_price);
		$min_regular_price = $min_regular_price === null ? $regular_price : min($min_regular_price, $regular_price);
		$max_regular_price = $max_regular_price === null ? $regular_price : max($max_regular_price, $regular_price);

		if ($current_price < $regular_price) {
			$has_discount = true;
		}
	}

	if ($min_price === null || $max_price === null) {
		return null;
	}

	if ($min_regular_price === null) {
		$min_regular_price = $min_price;
	}
	if ($max_regular_price === null) {
		$max_regular_price = $max_price;
	}

	return array(
		'minPrice' => $min_price,
		'maxPrice' => $max_price,
		'minRegularPrice' => $min_regular_price,
		'maxRegularPrice' => $max_regular_price,
		'hasDiscount' => $has_discount || $min_price < $min_regular_price || $max_price < $max_regular_price,
	);
}

function al_b2b_get_wholesale_prices($request) {
	$user = al_b2b_authenticate_request($request);
	if (is_wp_error($user)) {
		return $user;
	}

	if (!function_exists('wc_get_product') || !function_exists('wc_price')) {
		return new WP_Error('woocommerce_required', 'WooCommerce is required.', array('status' => 500));
	}

	$ids_param = (string) $request->get_param('ids');
	$id_parts = array_filter(array_map('trim', explode(',', $ids_param)));
	$ids = array();

	foreach ($id_parts as $part) {
		$id = (int) $part;
		if ($id > 0) {
			$ids[$id] = $id;
		}
	}

	$ids = array_values($ids);
	if (count($ids) > 100) {
		$ids = array_slice($ids, 0, 100);
	}

	$is_wholesale_viewer = al_b2b_is_wholesale_approved_user($user);
	$prices = array();

	$previous_user_id = get_current_user_id();
	wp_set_current_user($user->ID);

	foreach ($ids as $product_id) {
		$product = wc_get_product($product_id);
		if (!$product) {
			continue;
		}

		$current = al_b2b_normalize_price_number($product->get_price());
		$regular = al_b2b_normalize_price_number($product->get_regular_price());

		if ($current === null && $regular === null) {
			continue;
		}

		if ($current === null) {
			$current = $regular;
		}

		if ($regular === null) {
			$regular = $current;
		}

		$current_label = wp_strip_all_tags(wc_price($current));
		$regular_label = wp_strip_all_tags(wc_price($regular));
		$has_discount = $current < $regular;

		$is_variable_product = method_exists($product, 'is_type') && $product->is_type('variable');
		if ($is_variable_product) {
			$bounds = al_b2b_get_variable_price_bounds($product, $is_wholesale_viewer);
			$min_variation_price = $bounds && isset($bounds['minPrice']) ? $bounds['minPrice'] : $current;
			$max_variation_price = $bounds && isset($bounds['maxPrice']) ? $bounds['maxPrice'] : $min_variation_price;
			$min_variation_regular_price = $bounds && isset($bounds['minRegularPrice'])
				? $bounds['minRegularPrice']
				: ($regular !== null ? $regular : $min_variation_price);
			$max_variation_regular_price = $bounds && isset($bounds['maxRegularPrice'])
				? $bounds['maxRegularPrice']
				: $min_variation_regular_price;

			$current_label = al_b2b_format_price_range_label(
				$min_variation_price,
				$max_variation_price,
				$current
			);
			$regular_label = al_b2b_format_price_range_label(
				$min_variation_regular_price,
				$max_variation_regular_price,
				$regular
			);
			$has_discount = $bounds && array_key_exists('hasDiscount', $bounds)
				? (bool) $bounds['hasDiscount']
				: (
					$min_variation_price < $min_variation_regular_price ||
					$max_variation_price < $max_variation_regular_price
				);
		} else {
			$current_label = al_b2b_normalize_price_label($current_label);
			$regular_label = al_b2b_normalize_price_label($regular_label);
		}

		$prices[(string) $product_id] = array(
			'productId' => $product_id,
			'priceLabel' => $current_label,
			'regularPriceLabel' => $regular_label,
			'hasDiscount' => $has_discount,
			'source' => $is_wholesale_viewer ? 'wholesale' : 'retail',
		);
	}

	wp_set_current_user($previous_user_id);

	return rest_ensure_response(array(
		'isWholesaleViewer' => $is_wholesale_viewer,
		'prices' => $prices,
	));
}
