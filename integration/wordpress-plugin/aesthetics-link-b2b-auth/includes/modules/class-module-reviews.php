<?php
/**
 * Reviews module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Owns the product reviews surface that wraps WooCommerce's native
 * comment-based reviews:
 *
 *   GET  /aesthetics-link/v1/products/reviews?productId=...
 *   POST /aesthetics-link/v1/products/reviews
 *
 * Disabling the module hides both routes (404). WooCommerce's own review
 * UI in wp-admin is unaffected — this module only owns the headless
 * surface.
 *
 * A rating-summary endpoint (per the Phase 3 plan: aggregate star
 * breakdown) is a candidate for 3e; not yet implemented.
 */
class AL_B2B_Module_Reviews implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'reviews';
	}

	public function is_enabled(): bool {
		return true;
	}

	public function register(): void {
		add_action('rest_api_init', array($this, 'register_routes'));
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/products/reviews', array(
			'methods'             => 'GET',
			'callback'            => 'al_b2b_get_product_reviews',
			'permission_callback' => '__return_true',
		));

		register_rest_route('aesthetics-link/v1', '/products/reviews', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_submit_product_review',
			'permission_callback' => '__return_true',
		));
	}
}
