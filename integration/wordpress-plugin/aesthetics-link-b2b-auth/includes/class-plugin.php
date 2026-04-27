<?php
/**
 * Plugin orchestrator.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Top-level singleton that wires configuration, the module registry, and the
 * hook loader together.
 *
 * For Phase 3a the orchestrator is a no-op shell: the existing monolithic
 * file is still the source of truth for hook registrations and behaviour.
 * Subsequent sub-phases migrate functionality into modules and services
 * registered here, until the monolith shrinks to just the bootstrap.
 *
 * Usage from the main plugin file:
 *
 *   AL_B2B_Plugin::instance()->boot();
 */
final class AL_B2B_Plugin {

	private static ?AL_B2B_Plugin $instance = null;

	private array $config;
	private AL_B2B_Loader $loader;
	private AL_B2B_Modules $modules;
	private bool $booted = false;

	public static function instance(): AL_B2B_Plugin {
		if (self::$instance === null) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->config  = require dirname(__DIR__) . '/config/default-config.php';
		$this->loader  = new AL_B2B_Loader();
		$this->modules = new AL_B2B_Modules($this->config);
	}

	public function get_config(): array {
		return $this->config;
	}

	public function get_loader(): AL_B2B_Loader {
		return $this->loader;
	}

	public function get_modules(): AL_B2B_Modules {
		return $this->modules;
	}

	/**
	 * Boot the plugin once. Idempotent: a second call is a no-op.
	 *
	 * Order:
	 *   1. Modules are registered onto the registry by subsequent sub-phases
	 *      (no-op for now).
	 *   2. Enabled modules attach their hooks/routes to the loader.
	 *   3. The loader drains its queue into WordPress.
	 *
	 * The legacy monolithic registrations in
	 * `aesthetics-link-b2b-auth.php` continue to run alongside this until
	 * each responsibility is migrated.
	 */
	public function boot(): void {
		if ($this->booted) {
			return;
		}
		$this->booted = true;

		// Sub-phases 3b-3e will register modules onto $this->modules here.
		// e.g. $this->modules->register(new AL_B2B_Module_Wholesale_Pricing(...));

		$this->modules->boot_enabled();
		$this->loader->run();
	}
}
