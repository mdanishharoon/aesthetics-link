<?php
/**
 * Hook registration helper.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Tiny convenience layer over `add_action` / `add_filter`.
 *
 * Modules and services accumulate hook registrations on the loader during
 * `register()` instead of calling WordPress directly. The plugin's `boot()`
 * then drains the loader once. Two reasons:
 *
 *   1. We can introspect what's registered (logging, debugging, tests).
 *   2. A future test harness can intercept `run()` to skip side-effects.
 */
class AL_B2B_Loader {

	/**
	 * @var array<int, array{type:string, hook:string, callback:callable, priority:int, accepted_args:int}>
	 */
	private array $registrations = array();

	public function add_action(string $hook, callable $callback, int $priority = 10, int $accepted_args = 1): void {
		$this->registrations[] = array(
			'type'          => 'action',
			'hook'          => $hook,
			'callback'      => $callback,
			'priority'      => $priority,
			'accepted_args' => $accepted_args,
		);
	}

	public function add_filter(string $hook, callable $callback, int $priority = 10, int $accepted_args = 1): void {
		$this->registrations[] = array(
			'type'          => 'filter',
			'hook'          => $hook,
			'callback'      => $callback,
			'priority'      => $priority,
			'accepted_args' => $accepted_args,
		);
	}

	/**
	 * Register every accumulated hook with WordPress. Idempotent: clears the
	 * queue after running so a second call is a no-op.
	 */
	public function run(): void {
		foreach ($this->registrations as $registration) {
			if ($registration['type'] === 'action') {
				add_action(
					$registration['hook'],
					$registration['callback'],
					$registration['priority'],
					$registration['accepted_args']
				);
			} else {
				add_filter(
					$registration['hook'],
					$registration['callback'],
					$registration['priority'],
					$registration['accepted_args']
				);
			}
		}
		$this->registrations = array();
	}

	/**
	 * @return array<int, array{type:string, hook:string, callback:callable, priority:int, accepted_args:int}>
	 */
	public function get_registrations(): array {
		return $this->registrations;
	}
}
