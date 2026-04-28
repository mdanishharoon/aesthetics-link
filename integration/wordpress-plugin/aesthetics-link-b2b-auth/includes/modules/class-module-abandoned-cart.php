<?php
/**
 * Abandoned cart recovery module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Tracks WooCommerce cart activity, marks carts as abandoned after a
 * configurable inactivity window, and dispatches a `cart.abandoned`
 * webhook so the headless frontend can trigger recovery email/push.
 *
 * Tracking strategy:
 *   - On every `woocommerce_cart_updated` we upsert a row keyed by WC's
 *     own session customer ID (logged-in user ID OR per-session UUID for
 *     guests), capturing items, total, and last_seen_at.
 *   - On `woocommerce_checkout_order_processed` we mark the matching row
 *     `recovered`, since the customer has converted.
 *   - The hourly cron `al_b2b_abandoned_cart_check` finds rows with
 *     status='active' AND last_seen_at older than the configured
 *     threshold (default 60 minutes), dispatches the webhook, and flips
 *     them to status='abandoned' so we don't notify twice.
 *
 * Frontend can also POST /aesthetics-link/v1/cart/recovered with the cart
 * token to mark a row recovered (useful when the webhook is delayed and
 * the SPA already knows the order completed).
 *
 * Disabling the module: hooks come off, the route 404s, and the cron
 * stops scanning — but the existing rows are kept so re-enabling later
 * doesn't lose history.
 *
 * Function bodies for cart serialization are kept lean here. Production
 * deployments may want to extend the items_json shape with line meta,
 * variation attributes, and shipping address — those are easy additions
 * once the contract is exercised end-to-end.
 */
class AL_B2B_Module_Abandoned_Cart implements AL_B2B_Module_Interface, AL_B2B_Module_With_Schema {

	public const CRON_HOOK   = 'al_b2b_abandoned_cart_check';
	public const TABLE_SUFFIX = 'al_b2b_abandoned_carts';

	private AL_B2B_Webhook_Dispatcher $dispatcher;

	public function __construct(AL_B2B_Webhook_Dispatcher $dispatcher) {
		$this->dispatcher = $dispatcher;
	}

	public function get_id(): string {
		return 'abandoned_cart';
	}

	public function is_enabled(): bool {
		return class_exists('WooCommerce');
	}

	public function register(): void {
		add_action('woocommerce_cart_updated',           array($this, 'on_cart_updated'));
		add_action('woocommerce_checkout_order_processed', array($this, 'on_order_processed'), 10, 2);
		add_action(self::CRON_HOOK,                      array($this, 'scan_for_abandoned'));
		add_action('rest_api_init',                       array($this, 'register_routes'));

		if (!wp_next_scheduled(self::CRON_HOOK)) {
			wp_schedule_event(time() + HOUR_IN_SECONDS, 'hourly', self::CRON_HOOK);
		}
	}

	public function install_schema(): void {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$table   = $this->table_name();
		$collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			cart_token VARCHAR(190) NOT NULL,
			user_id BIGINT UNSIGNED NULL DEFAULT NULL,
			email VARCHAR(190) NOT NULL DEFAULT '',
			items_json LONGTEXT NULL,
			total VARCHAR(64) NOT NULL DEFAULT '',
			currency VARCHAR(8) NOT NULL DEFAULT '',
			status VARCHAR(32) NOT NULL DEFAULT 'active',
			last_seen_at DATETIME NOT NULL,
			notified_at DATETIME NULL DEFAULT NULL,
			recovered_at DATETIME NULL DEFAULT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY cart_token (cart_token),
			KEY status_last_seen (status, last_seen_at),
			KEY user_id (user_id),
			KEY email (email)
		) {$collate};";

		dbDelta($sql);
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/cart/recovered', array(
			'methods'             => 'POST',
			'callback'            => array($this, 'handle_mark_recovered'),
			'permission_callback' => '__return_true',
			'args'                => array(
				'cartToken' => array(
					'type'     => 'string',
					'required' => true,
				),
			),
		));
	}

	/**
	 * WC hook: cart contents changed. Upsert the row for this session.
	 */
	public function on_cart_updated(): void {
		if (!function_exists('WC') || !WC()->cart || !WC()->session) {
			return;
		}
		$cart = WC()->cart;
		if ($cart->is_empty()) {
			return;
		}

		$cart_token = (string) WC()->session->get_customer_id();
		if ($cart_token === '') {
			return;
		}

		$user_id = get_current_user_id();
		$email   = '';
		if ($user_id > 0) {
			$user  = get_user_by('id', $user_id);
			$email = $user ? (string) $user->user_email : '';
		}

		$this->upsert_active_cart($cart_token, $user_id ?: null, $email, $cart);
	}

	/**
	 * WC hook: order created from this session. Mark recovered.
	 */
	public function on_order_processed(int $order_id, array $posted_data): void {
		unset($posted_data);
		if (!function_exists('WC') || !WC()->session) {
			return;
		}
		$cart_token = (string) WC()->session->get_customer_id();
		if ($cart_token === '') {
			return;
		}
		$this->mark_recovered($cart_token);
	}

	/**
	 * Cron callback: dispatch webhook for any active cart older than the
	 * threshold; flip them to abandoned.
	 */
	public function scan_for_abandoned(): void {
		global $wpdb;

		$threshold_seconds = (int) apply_filters('al_b2b_abandoned_cart_threshold_seconds', HOUR_IN_SECONDS);
		$cutoff            = gmdate('Y-m-d H:i:s', time() - max(60, $threshold_seconds));
		$table             = $this->table_name();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE status = %s AND last_seen_at <= %s LIMIT 200",
				'active',
				$cutoff
			)
		);

		if (empty($rows)) {
			return;
		}

		foreach ($rows as $row) {
			$payload = array(
				'cartToken'  => $row->cart_token,
				'userId'     => $row->user_id ? (int) $row->user_id : null,
				'email'      => $row->email,
				'items'      => $this->decode_items($row->items_json),
				'total'      => $row->total,
				'currency'   => $row->currency,
				'lastSeenAt' => $row->last_seen_at,
			);

			$this->dispatcher->dispatch('cart.abandoned', $payload);

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->update(
				$table,
				array(
					'status'      => 'abandoned',
					'notified_at' => gmdate('Y-m-d H:i:s'),
				),
				array('id' => (int) $row->id),
				array('%s', '%s'),
				array('%d')
			);
		}
	}

	public function handle_mark_recovered(WP_REST_Request $request) {
		$cart_token = trim((string) $request->get_param('cartToken'));
		if ($cart_token === '') {
			return new WP_Error('invalid_cart_token', 'cartToken is required.', array('status' => 400));
		}
		$updated = $this->mark_recovered($cart_token);
		return new WP_REST_Response(array('updated' => (bool) $updated), 200);
	}

	private function upsert_active_cart(string $cart_token, ?int $user_id, string $email, WC_Cart $cart): void {
		global $wpdb;

		$totals = $cart->get_totals();
		$total  = isset($totals['total']) ? (string) $totals['total'] : '';
		$items  = array();
		foreach ($cart->get_cart() as $key => $item) {
			$items[] = array(
				'key'         => (string) $key,
				'productId'   => (int) ($item['product_id'] ?? 0),
				'variationId' => (int) ($item['variation_id'] ?? 0),
				'quantity'    => (int) ($item['quantity'] ?? 1),
			);
		}

		$now      = gmdate('Y-m-d H:i:s');
		$currency = function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : '';

		$existing_id = (int) $wpdb->get_var( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->prepare("SELECT id FROM {$this->table_name()} WHERE cart_token = %s", $cart_token)
		);

		$data = array(
			'cart_token'   => $cart_token,
			'user_id'      => $user_id,
			'email'        => $email,
			'items_json'   => wp_json_encode($items),
			'total'        => $total,
			'currency'     => (string) $currency,
			'status'       => 'active',
			'last_seen_at' => $now,
		);
		$formats = array('%s', '%d', '%s', '%s', '%s', '%s', '%s', '%s');

		if ($existing_id > 0) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->update($this->table_name(), $data, array('id' => $existing_id), $formats, array('%d'));
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->insert($this->table_name(), $data, $formats);
		}
	}

	private function mark_recovered(string $cart_token): int {
		global $wpdb;
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		return (int) $wpdb->update(
			$this->table_name(),
			array(
				'status'       => 'recovered',
				'recovered_at' => gmdate('Y-m-d H:i:s'),
			),
			array('cart_token' => $cart_token),
			array('%s', '%s'),
			array('%s')
		);
	}

	private function decode_items($items_json): array {
		if (!is_string($items_json) || $items_json === '') {
			return array();
		}
		$decoded = json_decode($items_json, true);
		return is_array($decoded) ? $decoded : array();
	}

	private function table_name(): string {
		global $wpdb;
		return $wpdb->prefix . self::TABLE_SUFFIX;
	}
}
