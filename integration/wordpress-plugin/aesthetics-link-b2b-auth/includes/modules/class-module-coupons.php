<?php
/**
 * Coupons module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Headless wrapper around WooCommerce's coupon system.
 *
 *   POST /aesthetics-link/v1/coupons/validate  { code, cartItems? }
 *   POST /aesthetics-link/v1/coupons/apply     { code }
 *
 * `validate` reports whether the supplied code is currently usable, with
 * structured failure reasons (expired, min_spend_not_met, usage_limit_reached,
 * not_found, ineligible_items, already_applied) so the frontend can render
 * actionable error messages.
 *
 * `apply` runs WC()->cart->apply_coupon() against the current session cart
 * — only meaningful when the request carries the matching cart cookies.
 *
 * Note: WooCommerce's `WC_Discounts::is_coupon_valid()` accepts a
 * full WC_Discounts context. For the cart-less validate path we synthesize
 * a discounts instance over WC()->cart so usage limits / min-spend checks
 * still trigger.
 *
 * Disabling the module: routes 404. Existing coupon configuration is
 * untouched (it lives in WooCommerce's own DB rows).
 */
class AL_B2B_Module_Coupons implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'coupons';
	}

	public function is_enabled(): bool {
		return class_exists('WooCommerce') && class_exists('WC_Coupon');
	}

	public function register(): void {
		add_action('rest_api_init', array($this, 'register_routes'));
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/coupons/validate', array(
			'methods'             => 'POST',
			'callback'            => array($this, 'handle_validate'),
			'permission_callback' => '__return_true',
			'args'                => array(
				'code' => array('type' => 'string', 'required' => true),
			),
		));

		register_rest_route('aesthetics-link/v1', '/coupons/apply', array(
			'methods'             => 'POST',
			'callback'            => array($this, 'handle_apply'),
			'permission_callback' => '__return_true',
			'args'                => array(
				'code' => array('type' => 'string', 'required' => true),
			),
		));
	}

	public function handle_validate(WP_REST_Request $request) {
		$code = sanitize_text_field((string) $request->get_param('code'));
		if ($code === '') {
			return new WP_Error('invalid_code', 'Coupon code is required.', array('status' => 400));
		}

		$coupon = new WC_Coupon($code);
		if (!$coupon->get_id()) {
			return new WP_REST_Response(array(
				'valid'  => false,
				'reason' => 'not_found',
				'message' => 'Coupon does not exist.',
			), 200);
		}

		// WC_Discounts requires a cart context. Use the session cart when present.
		$cart = function_exists('WC') && WC()->cart ? WC()->cart : null;
		try {
			$discounts = new WC_Discounts($cart);
			$result    = $discounts->is_coupon_valid($coupon);
		} catch (Exception $exception) {
			return new WP_REST_Response(array(
				'valid'   => false,
				'reason'  => 'ineligible_items',
				'message' => $exception->getMessage(),
			), 200);
		}

		if (is_wp_error($result)) {
			return new WP_REST_Response(array(
				'valid'   => false,
				'reason'  => $this->classify_wp_error($result->get_error_code()),
				'message' => $result->get_error_message(),
			), 200);
		}

		return new WP_REST_Response(array(
			'valid'    => true,
			'discount' => array(
				'code'        => $coupon->get_code(),
				'type'        => $coupon->get_discount_type(),
				'amount'      => (string) $coupon->get_amount(),
				'minSpend'    => (string) $coupon->get_minimum_amount(),
				'maxSpend'    => (string) $coupon->get_maximum_amount(),
				'usageLimit'  => (int) $coupon->get_usage_limit(),
				'usageCount'  => (int) $coupon->get_usage_count(),
				'description' => (string) $coupon->get_description(),
			),
		), 200);
	}

	public function handle_apply(WP_REST_Request $request) {
		$code = sanitize_text_field((string) $request->get_param('code'));
		if ($code === '') {
			return new WP_Error('invalid_code', 'Coupon code is required.', array('status' => 400));
		}
		if (!function_exists('WC') || !WC()->cart) {
			return new WP_Error('cart_unavailable', 'No active cart session.', array('status' => 400));
		}

		$applied = WC()->cart->apply_coupon($code);
		if (!$applied) {
			$notices = function_exists('wc_get_notices') ? wc_get_notices('error') : array();
			$message = !empty($notices) && isset($notices[0]['notice'])
				? wp_strip_all_tags((string) $notices[0]['notice'])
				: 'Coupon could not be applied.';
			if (function_exists('wc_clear_notices')) {
				wc_clear_notices();
			}
			return new WP_REST_Response(array(
				'applied' => false,
				'message' => $message,
			), 200);
		}

		return new WP_REST_Response(array('applied' => true), 200);
	}

	private function classify_wp_error(string $error_code): string {
		// WC_Discounts uses numeric error codes (100-117). Map the common
		// ones to stable strings for the frontend; fall through to 'invalid'.
		// Codes from woocommerce/includes/class-wc-discounts.php.
		$map = array(
			'100' => 'invalid',                // generic invalid
			'101' => 'not_applicable',         // not applicable to cart items
			'102' => 'ineligible_items',
			'103' => 'min_spend_not_met',
			'104' => 'max_spend_exceeded',
			'105' => 'usage_limit_reached',    // per coupon
			'106' => 'usage_limit_per_user',
			'107' => 'expired',
			'108' => 'min_quantity_not_met',
			'109' => 'max_quantity_exceeded',
			'110' => 'product_not_in_cart',
			'111' => 'category_not_in_cart',
			'112' => 'product_in_excluded_list',
			'113' => 'category_in_excluded_list',
			'114' => 'sale_items_excluded',
			'115' => 'min_excluded_items',
			'116' => 'invalid_email',
			'117' => 'invalid_user',
		);
		return $map[$error_code] ?? 'invalid';
	}
}
