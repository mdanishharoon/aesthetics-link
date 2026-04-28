<?php
/**
 * Wishlist module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Persistent wishlist for authenticated users.
 *
 * Storage: a single piece of user meta (AL_B2B_Module_Wishlist::META_KEY)
 * holds an array of { productId, variationId?, addedAt } items. No new DB
 * table is needed.
 *
 * Guest wishlists are intentionally NOT handled server-side — the frontend
 * persists them to localStorage and syncs on login by calling POST
 * /wishlist/add for each cached item. Keeps the server surface narrow and
 * the cookie-handling story simple (one less stateful cookie to govern).
 *
 * REST surface:
 *   GET    /aesthetics-link/v1/wishlist           (current user's items)
 *   POST   /aesthetics-link/v1/wishlist/add       { productId, variationId? }
 *   DELETE /aesthetics-link/v1/wishlist/remove    { productId, variationId? }
 *
 * All three require a valid bearer token (uses
 * AL_B2B_Base_REST_Controller::permission_authenticated).
 *
 * Disabling this module: routes 404. Existing wishlist meta is untouched.
 */
class AL_B2B_Module_Wishlist extends AL_B2B_Base_REST_Controller implements AL_B2B_Module_Interface {

	private const NAMESPACE_V1 = 'aesthetics-link/v1';
	public const META_KEY = 'al_b2b_wishlist';

	public function get_id(): string {
		return 'wishlist';
	}

	public function is_enabled(): bool {
		return class_exists('WooCommerce');
	}

	public function register(): void {
		add_action('rest_api_init', array($this, 'register_routes'));
	}

	public function register_routes(): void {
		$ns       = self::NAMESPACE_V1;
		$auth_cb  = $this->permission_authenticated();

		register_rest_route($ns, '/wishlist', array(
			'methods'             => 'GET',
			'callback'            => array($this, 'handle_get'),
			'permission_callback' => $auth_cb,
		));

		register_rest_route($ns, '/wishlist/add', array(
			'methods'             => 'POST',
			'callback'            => array($this, 'handle_add'),
			'permission_callback' => $auth_cb,
			'args'                => $this->item_args(true),
		));

		register_rest_route($ns, '/wishlist/remove', array(
			'methods'             => 'DELETE',
			'callback'            => array($this, 'handle_remove'),
			'permission_callback' => $auth_cb,
			'args'                => $this->item_args(true),
		));
	}

	public function handle_get(WP_REST_Request $request): WP_REST_Response {
		$user = $this->get_current_user($request);
		if (!$user) {
			return new WP_REST_Response(array('items' => array()), 200);
		}
		return new WP_REST_Response(array(
			'items' => $this->load_items($user->ID),
		), 200);
	}

	public function handle_add(WP_REST_Request $request) {
		$user = $this->get_current_user($request);
		if (!$user) {
			return new WP_Error('unauthorized', 'Not authenticated.', array('status' => 401));
		}

		$product_id   = (int) $request->get_param('productId');
		$variation_id = (int) $request->get_param('variationId');
		$variation_id = $variation_id > 0 ? $variation_id : null;

		if (!$this->product_exists($product_id)) {
			return new WP_Error('product_not_found', 'Product not found.', array('status' => 404));
		}

		$items = $this->load_items($user->ID);
		foreach ($items as $existing) {
			if ((int) $existing['productId'] === $product_id
				&& (int) ($existing['variationId'] ?? 0) === ($variation_id ?? 0)) {
				return new WP_REST_Response(array('items' => $items, 'added' => false), 200);
			}
		}

		$entry = array(
			'productId' => $product_id,
			'addedAt'   => gmdate('c'),
		);
		if ($variation_id !== null) {
			$entry['variationId'] = $variation_id;
		}
		$items[] = $entry;
		$this->save_items($user->ID, $items);

		return new WP_REST_Response(array('items' => $items, 'added' => true), 200);
	}

	public function handle_remove(WP_REST_Request $request): WP_REST_Response {
		$user = $this->get_current_user($request);
		if (!$user) {
			return new WP_REST_Response(array('items' => array(), 'removed' => false), 200);
		}

		$product_id   = (int) $request->get_param('productId');
		$variation_id = (int) $request->get_param('variationId');
		$variation_id = $variation_id > 0 ? $variation_id : null;

		$items   = $this->load_items($user->ID);
		$before  = count($items);
		$items   = array_values(array_filter($items, static function ($entry) use ($product_id, $variation_id) {
			return !((int) $entry['productId'] === $product_id
				&& (int) ($entry['variationId'] ?? 0) === ($variation_id ?? 0));
		}));

		if (count($items) !== $before) {
			$this->save_items($user->ID, $items);
		}

		return new WP_REST_Response(array(
			'items'   => $items,
			'removed' => count($items) !== $before,
		), 200);
	}

	/** @return array<int, array{productId:int, variationId?:int, addedAt:string}> */
	private function load_items(int $user_id): array {
		$raw = get_user_meta($user_id, self::META_KEY, true);
		if (!is_array($raw)) {
			return array();
		}
		$items = array();
		foreach ($raw as $entry) {
			if (!is_array($entry) || empty($entry['productId'])) {
				continue;
			}
			$item = array(
				'productId' => (int) $entry['productId'],
				'addedAt'   => isset($entry['addedAt']) ? (string) $entry['addedAt'] : '',
			);
			if (!empty($entry['variationId'])) {
				$item['variationId'] = (int) $entry['variationId'];
			}
			$items[] = $item;
		}
		return $items;
	}

	private function save_items(int $user_id, array $items): void {
		update_user_meta($user_id, self::META_KEY, $items);
	}

	private function product_exists(int $product_id): bool {
		if ($product_id <= 0) {
			return false;
		}
		$post = get_post($product_id);
		return $post instanceof WP_Post && $post->post_type === 'product';
	}

	private function item_args(bool $require_product_id): array {
		return array(
			'productId' => array(
				'type'     => 'integer',
				'required' => $require_product_id,
			),
			'variationId' => array(
				'type'     => 'integer',
				'required' => false,
			),
		);
	}
}
