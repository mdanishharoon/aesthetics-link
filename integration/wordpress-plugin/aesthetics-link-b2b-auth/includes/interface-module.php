<?php
/**
 * Module interface.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Contract every feature module must implement.
 *
 * The module registry resolves the toggle for each module from configuration;
 * the module itself implements `is_enabled()` only as an optional self-check
 * (e.g. "this module needs WooCommerce active"). When both the config flag
 * and `is_enabled()` are true, `register()` runs at boot.
 */
interface AL_B2B_Module_Interface {

	/**
	 * Stable identifier matching the key under `config['modules']`.
	 */
	public function get_id(): string;

	/**
	 * Self-gate: return false if the module's runtime requirements aren't
	 * met (e.g. WooCommerce missing). Defaults to true in concrete modules.
	 */
	public function is_enabled(): bool;

	/**
	 * Register hooks, REST routes, admin menus, and any other side effects
	 * the module needs. Called once at plugin boot.
	 */
	public function register(): void;
}
