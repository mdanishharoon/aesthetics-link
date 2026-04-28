<?php
/**
 * Multi-currency module — STUB.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Stub module documenting where to plug a multi-currency layer (WOOCS,
 * Aelia Currency Switcher, custom) into the headless flow.
 *
 * Frontend contract (when implemented):
 *
 *   - The storefront sends a `?currency=USD` query string OR an
 *     `X-AL-B2B-Currency: USD` header on every product/cart request.
 *   - This module reads it and informs WC of the active currency before
 *     downstream price calculations happen.
 *
 * Likely integration points:
 *
 *   - For WOOCS:    woocs_set_currency($code)
 *   - For Aelia:    set the WC()->session->set('client_currency', $code)
 *   - Custom:       hook `woocommerce_currency` filter and
 *                   `woocommerce_currency_symbol` filter
 *
 * No code is wired here. A deployer enables the module after installing
 * a currency plugin and edits register() to call into the chosen
 * provider.
 */
class AL_B2B_Module_Multi_Currency implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'multi_currency';
	}

	public function is_enabled(): bool {
		return true;
	}

	public function register(): void {
		// TODO: read currency from query string / header on rest_api_init,
		//       dispatch to chosen provider, set the WC currency for the
		//       remainder of the request lifecycle.
		// Intentional no-op until a deployer fills this in.
	}
}
