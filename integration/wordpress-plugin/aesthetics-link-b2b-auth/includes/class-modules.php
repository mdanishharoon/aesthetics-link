<?php
/**
 * Module registry & toggle resolver.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Holds every {@see AL_B2B_Module_Interface} the plugin ships and decides,
 * at boot time, which to register based on the current configuration.
 *
 * A module is registered if AND only if:
 *   - its config flag (`config['modules'][$id]`) is truthy, AND
 *   - its own `is_enabled()` returns true (e.g. WooCommerce active).
 *
 * Modules absent from the registry are silently skipped, so the plugin keeps
 * booting if a deployer drops one. New modules added later phases just call
 * `register()` here — the toggle and gating logic does not change.
 */
class AL_B2B_Modules {

	private array $config;

	/**
	 * @var array<string, AL_B2B_Module_Interface>
	 */
	private array $modules = array();

	public function __construct(array $config) {
		$this->config = $config;
	}

	public function register(AL_B2B_Module_Interface $module): void {
		$this->modules[$module->get_id()] = $module;
	}

	public function get(string $module_id): ?AL_B2B_Module_Interface {
		return $this->modules[$module_id] ?? null;
	}

	public function is_enabled(string $module_id): bool {
		$flag    = $this->config['modules'][$module_id] ?? false;
		$module  = $this->modules[$module_id] ?? null;
		return $flag && $module && $module->is_enabled();
	}

	/**
	 * Boot every module whose config flag is on AND that self-reports as
	 * enabled. Called once from {@see AL_B2B_Plugin::boot()}.
	 */
	public function boot_enabled(): void {
		foreach ($this->modules as $module_id => $module) {
			$flag = $this->config['modules'][$module_id] ?? false;
			if (!$flag) {
				continue;
			}
			if (!$module->is_enabled()) {
				continue;
			}
			$module->register();
		}
	}

	/**
	 * @return array<string, AL_B2B_Module_Interface>
	 */
	public function all(): array {
		return $this->modules;
	}
}
