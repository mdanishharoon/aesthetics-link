<?php
/**
 * Faceted search module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Headless product search with simultaneous facet counts.
 *
 *   GET /aesthetics-link/v1/products/search
 *     ?keyword=&category=&brand=&min_price=&max_price=
 *     &in_stock=&on_sale=&sort_by=&page=&per_page=
 *
 * Returns:
 *   {
 *     products: [...],
 *     pagination: { page, perPage, total, totalPages },
 *     facets: {
 *       categories: [{ slug, label, count }],
 *       brands:     [{ slug, label, count }],
 *       inStock:    { trueCount, falseCount },
 *       onSale:     { trueCount, falseCount },
 *       priceRange: { min, max }
 *     }
 *   }
 *
 * Implementation is intentionally MVP-grade: facets are computed by
 * iterating the FILTERED result set (capped at 500 rows for facet
 * computation regardless of pagination). For larger catalogs a deployer
 * should swap the implementation for a dedicated index (Algolia,
 * Meilisearch, Elasticsearch). The MVP is enough for the headless
 * storefront to render filter UIs without round-tripping for counts.
 */
class AL_B2B_Module_Faceted_Search implements AL_B2B_Module_Interface {

	private const FACET_SAMPLE_LIMIT = 500;

	public function get_id(): string {
		return 'faceted_search';
	}

	public function is_enabled(): bool {
		return class_exists('WooCommerce') && function_exists('wc_get_products');
	}

	public function register(): void {
		add_action('rest_api_init', array($this, 'register_routes'));
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/products/search', array(
			'methods'             => 'GET',
			'callback'            => array($this, 'handle_search'),
			'permission_callback' => '__return_true',
			'args'                => array(
				'keyword'   => array('type' => 'string'),
				'category'  => array('type' => 'string'),
				'brand'     => array('type' => 'string'),
				'min_price' => array('type' => 'number'),
				'max_price' => array('type' => 'number'),
				'in_stock'  => array('type' => 'boolean'),
				'on_sale'   => array('type' => 'boolean'),
				'sort_by'   => array('type' => 'string'),
				'page'      => array('type' => 'integer'),
				'per_page'  => array('type' => 'integer'),
			),
		));
	}

	public function handle_search(WP_REST_Request $request): WP_REST_Response {
		$page     = max(1, (int) $request->get_param('page'));
		$per_page = max(1, min(48, (int) ($request->get_param('per_page') ?: 12)));

		$base_query = $this->build_query_args($request);
		$query_args = $base_query + array(
			'limit'  => $per_page,
			'page'   => $page,
			'paginate' => true,
		);

		$result = wc_get_products($query_args);

		$products = array();
		foreach ($result->products as $product) {
			if ($product instanceof WC_Product) {
				$products[] = $this->shape_product($product);
			}
		}

		$total       = (int) $result->total;
		$total_pages = (int) $result->max_num_pages;
		$facets      = $this->compute_facets($base_query);

		return new WP_REST_Response(array(
			'products'   => $products,
			'pagination' => array(
				'page'       => $page,
				'perPage'    => $per_page,
				'total'      => $total,
				'totalPages' => $total_pages,
			),
			'facets'     => $facets,
		), 200);
	}

	private function build_query_args(WP_REST_Request $request): array {
		$args = array(
			'status' => 'publish',
		);

		$keyword = trim((string) $request->get_param('keyword'));
		if ($keyword !== '') {
			$args['s'] = $keyword;
		}

		$category = trim((string) $request->get_param('category'));
		if ($category !== '') {
			$args['category'] = array($category);
		}

		$brand = trim((string) $request->get_param('brand'));
		if ($brand !== '') {
			$args['tax_query'] = array(
				array(
					'taxonomy' => 'product_brand',
					'field'    => 'slug',
					'terms'    => $brand,
				),
			);
		}

		$min_price = $request->get_param('min_price');
		$max_price = $request->get_param('max_price');
		if ($min_price !== null || $max_price !== null) {
			$meta_query = isset($args['meta_query']) ? $args['meta_query'] : array();
			$range      = array('key' => '_price', 'type' => 'numeric');
			if ($min_price !== null && $max_price !== null) {
				$range['value']   = array((float) $min_price, (float) $max_price);
				$range['compare'] = 'BETWEEN';
			} elseif ($min_price !== null) {
				$range['value']   = (float) $min_price;
				$range['compare'] = '>=';
			} else {
				$range['value']   = (float) $max_price;
				$range['compare'] = '<=';
			}
			$meta_query[]       = $range;
			$args['meta_query'] = $meta_query;
		}

		if ($request->get_param('in_stock')) {
			$args['stock_status'] = 'instock';
		}
		if ($request->get_param('on_sale')) {
			$args['on_sale'] = true;
		}

		$sort_by = (string) $request->get_param('sort_by');
		switch ($sort_by) {
			case 'price_asc':
				$args['orderby'] = 'price';
				$args['order']   = 'ASC';
				break;
			case 'price_desc':
				$args['orderby'] = 'price';
				$args['order']   = 'DESC';
				break;
			case 'newest':
				$args['orderby'] = 'date';
				$args['order']   = 'DESC';
				break;
			case 'popularity':
				$args['orderby'] = 'popularity';
				break;
			case 'rating':
				$args['orderby'] = 'rating';
				break;
		}

		return $args;
	}

	private function compute_facets(array $base_query): array {
		// Pull a capped sample of the FILTERED result set for facet counting.
		$sample_args            = $base_query;
		$sample_args['limit']   = self::FACET_SAMPLE_LIMIT;
		$sample_args['return']  = 'objects';
		unset($sample_args['paginate'], $sample_args['page']);

		$products = wc_get_products($sample_args);

		$categories = array();
		$brands     = array();
		$in_stock_true  = 0;
		$in_stock_false = 0;
		$on_sale_true   = 0;
		$on_sale_false  = 0;
		$min_price      = null;
		$max_price      = null;

		foreach ($products as $product) {
			if (!$product instanceof WC_Product) {
				continue;
			}
			foreach ($product->get_category_ids() as $cat_id) {
				$term = get_term((int) $cat_id, 'product_cat');
				if ($term instanceof WP_Term) {
					$categories[$term->slug] = ($categories[$term->slug] ?? array(
						'slug'  => $term->slug,
						'label' => $term->name,
						'count' => 0,
					));
					$categories[$term->slug]['count']++;
				}
			}

			$brand_terms = wp_get_post_terms($product->get_id(), 'product_brand');
			if (is_array($brand_terms)) {
				foreach ($brand_terms as $term) {
					if ($term instanceof WP_Term) {
						$brands[$term->slug] = ($brands[$term->slug] ?? array(
							'slug'  => $term->slug,
							'label' => $term->name,
							'count' => 0,
						));
						$brands[$term->slug]['count']++;
					}
				}
			}

			if ($product->is_in_stock()) {
				$in_stock_true++;
			} else {
				$in_stock_false++;
			}
			if ($product->is_on_sale()) {
				$on_sale_true++;
			} else {
				$on_sale_false++;
			}

			$price = (float) $product->get_price();
			if ($price > 0) {
				$min_price = $min_price === null ? $price : min($min_price, $price);
				$max_price = $max_price === null ? $price : max($max_price, $price);
			}
		}

		return array(
			'categories' => array_values($categories),
			'brands'     => array_values($brands),
			'inStock'    => array('trueCount' => $in_stock_true, 'falseCount' => $in_stock_false),
			'onSale'     => array('trueCount' => $on_sale_true,  'falseCount' => $on_sale_false),
			'priceRange' => array('min' => $min_price, 'max' => $max_price),
		);
	}

	private function shape_product(WC_Product $product): array {
		return array(
			'id'           => $product->get_id(),
			'slug'         => $product->get_slug(),
			'name'         => $product->get_name(),
			'price'        => (string) $product->get_price(),
			'regularPrice' => (string) $product->get_regular_price(),
			'salePrice'    => (string) $product->get_sale_price(),
			'onSale'       => $product->is_on_sale(),
			'inStock'      => $product->is_in_stock(),
			'image'        => wp_get_attachment_image_url($product->get_image_id(), 'medium') ?: '',
		);
	}
}
