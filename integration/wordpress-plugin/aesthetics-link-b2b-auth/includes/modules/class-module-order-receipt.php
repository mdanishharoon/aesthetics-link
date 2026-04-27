<?php
/**
 * Order receipt module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Owns the post-checkout order surface that the frontend uses to render
 * the order-confirmed and guest-order-lookup pages.
 *
 *   POST /aesthetics-link/v1/orders/lookup        (guest: order# + email)
 *   GET  /aesthetics-link/v1/orders/confirmation  (authenticated/signed receipt)
 *
 * Plus the `woocommerce_get_return_url` filter that overrides the default
 * WC return URL with a signed token-bearing URL pointing at the frontend's
 * /api/checkout/complete endpoint, and the `allowed_redirect_hosts` filter
 * that whitelists the frontend domain for safe redirects.
 *
 * Receipt tokens are HMAC-signed by the same secret as the checkout
 * bridge (AL_B2B_CHECKOUT_BRIDGE_SECRET) with a TTL filterable via the
 * al_b2b_order_receipt_ttl hook (default: 2 days).
 *
 * Disabling this module: orders no longer redirect to the frontend after
 * checkout; the two REST routes 404. WooCommerce's native thankyou page
 * is used instead.
 */
class AL_B2B_Module_Order_Receipt implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'order_receipt';
	}

	public function is_enabled(): bool {
		return true;
	}

	public function register(): void {
		add_action('rest_api_init', array($this, 'register_routes'));
		add_filter('woocommerce_get_return_url', 'al_b2b_override_return_url', 10, 2);
		add_filter('allowed_redirect_hosts', 'al_b2b_allow_frontend_redirect_host');
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/orders/lookup', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_lookup_guest_order',
			'permission_callback' => '__return_true',
		));

		register_rest_route('aesthetics-link/v1', '/orders/confirmation', array(
			'methods'             => 'GET',
			'callback'            => 'al_b2b_get_order_confirmation',
			'permission_callback' => '__return_true',
		));
	}
}
