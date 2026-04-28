<?php
/**
 * Multi-language module — STUB.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Stub module documenting where to plug a multi-language layer (WPML,
 * Polylang, TranslatePress) into the headless flow.
 *
 * Frontend contract (when implemented):
 *
 *   - The storefront forwards the user's locale via the standard
 *     Accept-Language header, OR sends an explicit `?lang=fr` query
 *     param on REST calls when the user picks a language.
 *
 * Likely integration points:
 *
 *   - WPML:        do_action('wpml_switch_language', $code) at the start
 *                  of each REST request.
 *   - Polylang:    pll_set_current_language($code) similarly.
 *
 * REST responses should include the resolved language so the frontend
 * can show a sanity indicator for translation coverage gaps.
 *
 * No code is wired here. Enable the module after installing a
 * language plugin and edit register() accordingly.
 */
class AL_B2B_Module_Multi_Language implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'multi_language';
	}

	public function is_enabled(): bool {
		return true;
	}

	public function register(): void {
		// TODO: parse Accept-Language / ?lang= and dispatch to the
		//       configured language provider on rest_api_init.
		// Intentional no-op until a deployer fills this in.
	}
}
