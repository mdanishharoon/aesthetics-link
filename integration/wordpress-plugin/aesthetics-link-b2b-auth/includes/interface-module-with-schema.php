<?php
/**
 * Optional schema interface for modules that own DB tables.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Modules implementing this interface have their `install_schema()` method
 * called once during plugin activation, in addition to the existing
 * `al_b2b_create_tables()`. Modules without DB tables simply don't
 * implement it.
 *
 * Schemas are installed for EVERY registered module regardless of whether
 * the module is enabled — this lets a deployer flip a module on later
 * without re-running activation. Cost: the table exists empty when the
 * module is disabled, which is acceptable.
 */
interface AL_B2B_Module_With_Schema {

	/**
	 * Create / migrate the module's DB tables. Use `dbDelta()` so repeated
	 * calls are idempotent and tolerate column additions across versions.
	 */
	public function install_schema(): void;
}
