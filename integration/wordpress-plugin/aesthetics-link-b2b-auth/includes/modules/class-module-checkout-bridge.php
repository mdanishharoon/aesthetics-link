<?php
/**
 * Checkout bridge module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Hand-off from the headless Next.js storefront to the WooCommerce-hosted
 * checkout. The frontend builds an HMAC-signed payload containing
 * { cart_token, user_id, iat, exp } and redirects to:
 *
 *   GET /aesthetics-link/v1/checkout/bridge?al_b2b_checkout_bridge=...&sig=...
 *
 * The handler verifies the signature, hydrates a WC cart from the Store API
 * cart_token, logs the user in to WC's session, and redirects to
 * wc_get_checkout_url(). The signing secret is shared with the frontend via
 * AL_B2B_CHECKOUT_BRIDGE_SECRET.
 *
 * Also owns the template_redirect filter that locks the checkout subdomain
 * — non-checkout traffic on the WC subdomain is bounced back to the
 * frontend so the SPA stays canonical for everything except checkout.
 *
 * Disabling this module: the /checkout/bridge route 404s and the subdomain
 * lock is removed. Useful for deployments that handle checkout themselves
 * via the WC Store API checkout endpoint instead of redirecting.
 */
class AL_B2B_Module_Checkout_Bridge implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'checkout_bridge';
	}

	public function is_enabled(): bool {
		return true;
	}

	public function register(): void {
		add_action('rest_api_init', array($this, 'register_routes'));
		add_action('template_redirect', 'al_b2b_lock_checkout_subdomain', 1);
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/checkout/bridge', array(
			'methods'             => 'GET',
			'callback'            => 'al_b2b_rest_checkout_bridge',
			'permission_callback' => '__return_true',
		));
	}
}
