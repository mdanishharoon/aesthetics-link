<?php
/**
 * Wholesale pricing module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Owns the wholesale pricing engine: variation > product > category > global
 * discount resolution, the WooCommerce price-getter filter chain, the admin
 * fields on product / variation / category screens, and the
 * /auth/wholesale-prices REST endpoint.
 *
 * Registers when `config['modules']['wholesale_pricing']` is true. Disabling
 * the module hides every wholesale-related field from WP admin and removes
 * the price filters - storefront prices revert to standard WooCommerce
 * behaviour without any code change.
 *
 * Phase 3d.2 wires the existing global function callbacks. Moving the
 * function bodies into class methods is a follow-up cleanup; behaviour is
 * unchanged in this commit.
 */
class AL_B2B_Module_Wholesale_Pricing implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'wholesale_pricing';
	}

	public function is_enabled(): bool {
		// Wholesale pricing is meaningful only when WooCommerce is active.
		return class_exists('WooCommerce');
	}

	public function register(): void {
		// Storefront price filters (priority 99 to run after most other plugins).
		add_filter('woocommerce_product_get_price',                  'al_b2b_filter_wholesale_price',         99, 2);
		add_filter('woocommerce_product_get_regular_price',          'al_b2b_filter_wholesale_regular_price', 99, 2);
		add_filter('woocommerce_product_get_sale_price',             'al_b2b_filter_wholesale_sale_price',    99, 2);
		add_filter('woocommerce_product_variation_get_price',        'al_b2b_filter_wholesale_price',         99, 2);
		add_filter('woocommerce_product_variation_get_regular_price', 'al_b2b_filter_wholesale_regular_price', 99, 2);
		add_filter('woocommerce_product_variation_get_sale_price',   'al_b2b_filter_wholesale_sale_price',    99, 2);

		// Admin fields on product / variation / category screens.
		add_action('woocommerce_product_options_pricing',     'al_b2b_render_product_wholesale_fields');
		add_action('woocommerce_process_product_meta',        'al_b2b_save_product_wholesale_fields');
		add_action('woocommerce_variation_options_pricing',   'al_b2b_render_variation_wholesale_fields',   10, 3);
		add_action('woocommerce_save_product_variation',      'al_b2b_save_variation_wholesale_fields',     10, 2);
		add_action('product_cat_add_form_fields',             'al_b2b_render_product_cat_wholesale_add_fields');
		add_action('product_cat_edit_form_fields',            'al_b2b_render_product_cat_wholesale_edit_fields', 10, 1);
		add_action('created_product_cat',                     'al_b2b_save_product_cat_wholesale_fields',   10, 1);
		add_action('edited_product_cat',                      'al_b2b_save_product_cat_wholesale_fields',   10, 1);

		// Wholesale-prices REST endpoint.
		add_action('rest_api_init', array($this, 'register_routes'));
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/auth/wholesale-prices', array(
			'methods'             => 'GET',
			'callback'            => 'al_b2b_get_wholesale_prices',
			'permission_callback' => '__return_true',
		));
	}
}
