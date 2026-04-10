<?php
/**
 * Plugin Name: AestheticsLink B2B Auth
 * Description: Custom REST auth, clinic approval workflow, and wholesale pricing endpoints for AestheticsLink storefront.
 * Version: 0.2.0
 * Author: AestheticsLink
 */

if (!defined('ABSPATH')) {
	exit;
}

const AL_B2B_SESSION_TABLE = 'al_b2b_sessions';
const AL_B2B_AUDIT_TABLE = 'al_b2b_audit_log';
const AL_B2B_CLEANUP_EVENT = 'al_b2b_cleanup_sessions_event';

const AL_B2B_ACCOUNT_TYPE_META = 'al_account_type';
const AL_B2B_CLINIC_STATUS_META = 'al_clinic_status';
const AL_B2B_BUSINESS_INFO_META = 'al_business_info';
const AL_B2B_EMAIL_VERIFIED_META = 'al_email_verified';
const AL_B2B_EMAIL_VERIFY_HASH_META = 'al_email_verification_hash';
const AL_B2B_EMAIL_VERIFY_EXPIRES_META = 'al_email_verification_expires';
const AL_B2B_PASSWORD_RESET_HASH_META = 'al_password_reset_hash';
const AL_B2B_PASSWORD_RESET_EXPIRES_META = 'al_password_reset_expires';

const AL_B2B_ADMIN_NONCE_ACTION = 'al_b2b_clinic_decision';
const AL_B2B_VERIFY_TTL = 2 * DAY_IN_SECONDS;
const AL_B2B_RESET_TTL = HOUR_IN_SECONDS;
const AL_B2B_SESSION_TTL = 30 * DAY_IN_SECONDS;

register_activation_hook(__FILE__, 'al_b2b_activate');
register_deactivation_hook(__FILE__, 'al_b2b_deactivate');

add_action('admin_menu', 'al_b2b_register_admin_menu');
add_action('admin_init', 'al_b2b_handle_admin_actions');
add_action('rest_api_init', 'al_b2b_register_routes');
add_action(AL_B2B_CLEANUP_EVENT, 'al_b2b_cleanup_expired_sessions');
add_action('template_redirect', 'al_b2b_maybe_handle_checkout_bridge', 1);

function al_b2b_activate() {
	al_b2b_ensure_roles();
	al_b2b_create_tables();

	if (!wp_next_scheduled(AL_B2B_CLEANUP_EVENT)) {
		wp_schedule_event(time() + HOUR_IN_SECONDS, 'hourly', AL_B2B_CLEANUP_EVENT);
	}
}

function al_b2b_deactivate() {
	$timestamp = wp_next_scheduled(AL_B2B_CLEANUP_EVENT);
	if ($timestamp) {
		wp_unschedule_event($timestamp, AL_B2B_CLEANUP_EVENT);
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

function al_b2b_create_tables() {
	global $wpdb;

	$charset_collate = $wpdb->get_charset_collate();
	$sessions_table = al_b2b_get_sessions_table_name();
	$audit_table = al_b2b_get_audit_table_name();

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

	dbDelta($sql_sessions);
	dbDelta($sql_audit);
}

function al_b2b_cleanup_expired_sessions() {
	global $wpdb;

	$table = al_b2b_get_sessions_table_name();
	$now = gmdate('Y-m-d H:i:s');
	$wpdb->query($wpdb->prepare("DELETE FROM {$table} WHERE expires_at <= %s", $now)); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.PreparedSQL.NotPrepared
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

function al_b2b_get_frontend_base_url() {
	$defined = defined('AL_B2B_FRONTEND_URL') ? trim((string) AL_B2B_FRONTEND_URL) : '';
	$base = $defined ? $defined : home_url('/');

	return untrailingslashit(apply_filters('al_b2b_frontend_base_url', $base));
}

function al_b2b_build_frontend_url($path, $query = array()) {
	$base = al_b2b_get_frontend_base_url();
	$url = $base . '/' . ltrim((string) $path, '/');

	if (!empty($query)) {
		$url = add_query_arg($query, $url);
	}

	return $url;
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

function al_b2b_parse_bearer_token($request) {
	$header = $request->get_header('authorization');
	if (!$header) {
		return null;
	}

	if (!preg_match('/Bearer\s+(.+)$/i', $header, $matches)) {
		return null;
	}

	$token = trim($matches[1]);
	return $token ? $token : null;
}

function al_b2b_issue_session($user_id) {
	global $wpdb;

	$user_id = (int) $user_id;
	if ($user_id <= 0) {
		return null;
	}

	try {
		$token = bin2hex(random_bytes(32));
	} catch (Exception $exception) {
		$token = wp_generate_password(64, false, false);
	}

	$hash = hash_hmac('sha256', $token, wp_salt('auth'));
	$table = al_b2b_get_sessions_table_name();
	$expires_at = gmdate('Y-m-d H:i:s', time() + AL_B2B_SESSION_TTL);

	$inserted = $wpdb->insert(
		$table,
		array(
			'token_hash' => $hash,
			'user_id' => $user_id,
			'expires_at' => $expires_at,
		),
		array('%s', '%d', '%s')
	);

	if (!$inserted) {
		return null;
	}

	return $token;
}

function al_b2b_delete_session($token) {
	global $wpdb;

	if (!$token) {
		return;
	}

	$table = al_b2b_get_sessions_table_name();
	$hash = hash_hmac('sha256', $token, wp_salt('auth'));

	$wpdb->delete($table, array('token_hash' => $hash), array('%s')); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
}

function al_b2b_delete_sessions_for_user($user_id) {
	global $wpdb;

	$user_id = (int) $user_id;
	if ($user_id <= 0) {
		return;
	}

	$table = al_b2b_get_sessions_table_name();
	$wpdb->delete($table, array('user_id' => $user_id), array('%d')); // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
}

function al_b2b_get_user_from_token($token) {
	global $wpdb;

	if (!$token) {
		return null;
	}

	$table = al_b2b_get_sessions_table_name();
	$hash = hash_hmac('sha256', $token, wp_salt('auth'));

	$row = $wpdb->get_row( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->prepare(
			"SELECT user_id, expires_at FROM {$table} WHERE token_hash = %s LIMIT 1",
			$hash
		)
	);

	if (!$row || !isset($row->user_id, $row->expires_at)) {
		return null;
	}

	$expires_ts = strtotime((string) $row->expires_at . ' UTC');
	if (!$expires_ts || $expires_ts < time()) {
		al_b2b_delete_session($token);
		return null;
	}

	$user = get_user_by('id', (int) $row->user_id);
	if (!$user) {
		al_b2b_delete_session($token);
		return null;
	}

	return $user;
}

function al_b2b_fetch_store_cart_by_token($cart_token) {
	if (!function_exists('rest_get_server')) {
		return null;
	}

	$request = new WP_REST_Request('GET', '/wc/store/v1/cart');
	$request->set_header('Accept', 'application/json');
	$request->set_header('Cart-Token', (string) $cart_token);
	$response = rest_get_server()->dispatch($request);

	if (is_wp_error($response)) {
		al_b2b_log_checkout_bridge_error('Store cart fetch failed before response dispatch completed.', array(
			'cart_token_present' => !empty($cart_token),
			'message' => $response->get_error_message(),
		));
		return null;
	}

	$status = method_exists($response, 'get_status') ? (int) $response->get_status() : 500;
	if ($status < 200 || $status >= 300) {
		$data = method_exists($response, 'get_data') ? $response->get_data() : null;
		al_b2b_log_checkout_bridge_error('Store cart fetch returned a non-success status.', array(
			'status' => $status,
			'body' => is_array($data) ? $data : null,
		));
		return null;
	}

	$data = method_exists($response, 'get_data') ? $response->get_data() : null;
	return is_array($data) ? $data : null;
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

	$checkout_url = function_exists('wc_get_checkout_url') ? wc_get_checkout_url() : home_url('/checkout');
	$failure_url = al_b2b_get_checkout_bridge_failure_url('bridge_invalid');
	try {
		$payload = al_b2b_parse_checkout_bridge_payload($encoded_payload, $signature);

		if (!$payload || !isset($payload['cartToken'])) {
			wp_safe_redirect($failure_url);
			exit;
		}

		$sync_result = al_b2b_sync_wc_cart_from_store_token(
			$payload['cartToken'],
			isset($payload['userId']) ? (int) $payload['userId'] : 0
		);
		if (empty($sync_result['ok'])) {
			al_b2b_log_checkout_bridge_error('Bridge cart sync did not complete successfully.', array(
				'error_code' => isset($sync_result['error_code']) ? $sync_result['error_code'] : 'bridge_sync_failed',
				'source_line_count' => isset($sync_result['source_line_count']) ? $sync_result['source_line_count'] : 0,
				'source_quantity_total' => isset($sync_result['source_quantity_total']) ? $sync_result['source_quantity_total'] : 0,
				'final_quantity_total' => isset($sync_result['final_quantity_total']) ? $sync_result['final_quantity_total'] : 0,
				'failed_lines' => isset($sync_result['failed_lines']) ? $sync_result['failed_lines'] : 0,
			));
			wp_safe_redirect(al_b2b_get_checkout_bridge_failure_url(
				isset($sync_result['error_code']) ? $sync_result['error_code'] : 'bridge_sync_failed'
			));
			exit;
		}

		wp_safe_redirect($checkout_url);
		exit;
	} catch (Throwable $error) {
		al_b2b_log_checkout_bridge_error('Checkout bridge request crashed.', array(
			'message' => $error->getMessage(),
			'file' => $error->getFile(),
			'line' => $error->getLine(),
		));
		wp_safe_redirect(al_b2b_get_checkout_bridge_failure_url('bridge_crashed'));
		exit;
	}
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
		'emailVerified' => al_b2b_is_email_verified($user->ID),
		'wholesaleApproved' => al_b2b_is_wholesale_approved_user($user),
	);
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

	if (!isset($_POST['al_b2b_admin_action']) || $_POST['al_b2b_admin_action'] !== 'clinic_decision') {
		return;
	}

	check_admin_referer(AL_B2B_ADMIN_NONCE_ACTION);

	$decision = isset($_POST['decision']) ? sanitize_key(wp_unslash($_POST['decision'])) : '';
	$user_id = isset($_POST['user_id']) ? (int) $_POST['user_id'] : 0;
	$actor_user_id = get_current_user_id();

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
	$notice = isset($_GET['al_b2b_notice']) ? sanitize_key(wp_unslash($_GET['al_b2b_notice'])) : '';
	?>
	<div class="wrap">
		<h1>Clinic Applications</h1>
		<p>Review clinic registrations and approve or reject wholesale access.</p>
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
	</div>
	<?php
}

function al_b2b_register_routes() {
	register_rest_route('aesthetics-link/v1', '/auth/register', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_register_user',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/auth/login', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_login_user',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/auth/me', array(
		'methods' => 'GET',
		'callback' => 'al_b2b_get_me',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/auth/logout', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_logout_user',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/auth/request-email-verification', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_request_email_verification',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/auth/verify-email', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_verify_email',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/auth/request-password-reset', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_request_password_reset',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/auth/reset-password', array(
		'methods' => 'POST',
		'callback' => 'al_b2b_reset_password',
		'permission_callback' => '__return_true',
	));

	register_rest_route('aesthetics-link/v1', '/auth/wholesale-prices', array(
		'methods' => 'GET',
		'callback' => 'al_b2b_get_wholesale_prices',
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
	update_user_meta($user_id, AL_B2B_EMAIL_VERIFIED_META, 0);

	$user = get_user_by('id', $user_id);
	$email_sent = al_b2b_send_verification_email($user);

	return rest_ensure_response(array(
		'user' => al_b2b_map_user($user),
		'requiresApproval' => $account_type === 'clinic',
		'requiresEmailVerification' => true,
		'emailDeliveryAttempted' => $email_sent,
		'message' => 'Account created. Please check your inbox to verify your email.',
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
	$token = al_b2b_parse_bearer_token($request);
	if (!$token) {
		return new WP_Error('unauthorized', 'Not authenticated.', array('status' => 401));
	}

	$user = al_b2b_get_user_from_token($token);
	if (!$user) {
		return new WP_Error('unauthorized', 'Session expired or invalid.', array('status' => 401));
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
		if ($user && !al_b2b_is_email_verified($user->ID)) {
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

function al_b2b_normalize_price_number($value) {
	if ($value === '' || $value === null) {
		return null;
	}

	if (!is_numeric($value)) {
		return null;
	}

	return (float) $value;
}

function al_b2b_get_wholesale_prices($request) {
	$token = al_b2b_parse_bearer_token($request);
	if (!$token) {
		return new WP_Error('unauthorized', 'Not authenticated.', array('status' => 401));
	}

	$user = al_b2b_get_user_from_token($token);
	if (!$user) {
		return new WP_Error('unauthorized', 'Session expired or invalid.', array('status' => 401));
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
