<?php
/**
 * Real-time stock module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Pushes stock changes to the headless frontend via webhook so the
 * storefront can revalidate / update product cards in (near) real time.
 *
 * Triggers a `stock.updated` webhook on:
 *   - woocommerce_product_set_stock      (admin manually edits stock)
 *   - woocommerce_variation_set_stock    (variation stock edited)
 *   - woocommerce_reduce_order_stock     (order placed)
 *
 * Plus a poll endpoint:
 *   GET /aesthetics-link/v1/products/{id}/stock
 *
 * Webhook payload:
 *   {
 *     productId, variationId?, sku, stockStatus, stockQuantity, manageStock
 *   }
 *
 * Disabling the module: hooks come off (no more outbound webhooks),
 * route 404s. WC's own stock management is untouched.
 */
class AL_B2B_Module_Real_Time_Stock implements AL_B2B_Module_Interface {

	private AL_B2B_Webhook_Dispatcher $dispatcher;

	public function __construct(AL_B2B_Webhook_Dispatcher $dispatcher) {
		$this->dispatcher = $dispatcher;
	}

	public function get_id(): string {
		return 'real_time_stock';
	}

	public function is_enabled(): bool {
		return class_exists('WooCommerce');
	}

	public function register(): void {
		add_action('woocommerce_product_set_stock',     array($this, 'on_stock_changed'));
		add_action('woocommerce_variation_set_stock',   array($this, 'on_stock_changed'));
		add_action('woocommerce_reduce_order_stock',    array($this, 'on_order_stock_reduced'));
		add_action('rest_api_init', array($this, 'register_routes'));
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/products/(?P<id>\d+)/stock', array(
			'methods'             => 'GET',
			'callback'            => array($this, 'handle_get_stock'),
			'permission_callback' => '__return_true',
			'args'                => array(
				'id' => array('type' => 'integer', 'required' => true),
			),
		));
	}

	public function on_stock_changed($product): void {
		if (!$product instanceof WC_Product) {
			return;
		}
		$this->dispatcher->dispatch('stock.updated', $this->shape_payload($product));
	}

	public function on_order_stock_reduced($order): void {
		if (!$order instanceof WC_Order) {
			return;
		}

		// Batch every line item into a single webhook so a 50-item B2B order
		// triggers one outbound HTTP call, not 50.
		$items = array();
		foreach ($order->get_items() as $item) {
			if (!$item instanceof WC_Order_Item_Product) {
				continue;
			}
			$product = $item->get_product();
			if ($product instanceof WC_Product) {
				$items[] = $this->shape_payload($product);
			}
		}

		if ($items === array()) {
			return;
		}

		$this->dispatcher->dispatch('stock.batch_updated', array(
			'orderId'  => $order->get_id(),
			'products' => $items,
		));
	}

	public function handle_get_stock(WP_REST_Request $request) {
		$product_id = (int) $request->get_param('id');
		$product    = function_exists('wc_get_product') ? wc_get_product($product_id) : null;

		if (!$product instanceof WC_Product) {
			return new WP_Error('product_not_found', 'Product not found.', array('status' => 404));
		}

		return new WP_REST_Response($this->shape_payload($product), 200);
	}

	private function shape_payload(WC_Product $product): array {
		$payload = array(
			'productId'    => $product->get_id(),
			'sku'          => (string) $product->get_sku(),
			'stockStatus'  => (string) $product->get_stock_status(),
			'stockQuantity' => $product->get_stock_quantity(),
			'manageStock'  => (bool) $product->get_manage_stock(),
		);
		if ($product instanceof WC_Product_Variation) {
			$payload['variationId'] = $product->get_id();
			$payload['productId']   = $product->get_parent_id();
		}
		return $payload;
	}
}
