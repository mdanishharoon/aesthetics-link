<?php
/**
 * Plugin orchestrator.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Top-level singleton that wires configuration, the auth strategy, the
 * module registry, and the hook loader together.
 *
 * Usage from the main plugin file:
 *
 *   AL_B2B_Plugin::instance()->boot();
 *
 * Other code reaches the strategy via:
 *
 *   $strategy = AL_B2B_Plugin::instance()->get_auth_strategy();
 */
final class AL_B2B_Plugin {

	private static ?AL_B2B_Plugin $instance = null;

	private array $config;
	private AL_B2B_Loader $loader;
	private AL_B2B_Modules $modules;
	private AL_B2B_Auth_Strategy_Interface $auth_strategy;
	private AL_B2B_Webhook_Dispatcher $webhook_dispatcher;
	private AL_B2B_Auth_Controller $auth_controller;
	private bool $booted = false;

	public static function instance(): AL_B2B_Plugin {
		if (self::$instance === null) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		$this->config             = require dirname(__DIR__) . '/config/default-config.php';
		$this->loader             = new AL_B2B_Loader();
		$this->modules            = new AL_B2B_Modules($this->config);
		$this->auth_strategy      = $this->create_auth_strategy();
		$this->webhook_dispatcher = new AL_B2B_Webhook_Dispatcher(
			isset($this->config['webhooks']) && is_array($this->config['webhooks'])
				? $this->config['webhooks']
				: array()
		);
		$this->auth_controller    = new AL_B2B_Auth_Controller($this->auth_strategy);
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

	public function get_auth_strategy(): AL_B2B_Auth_Strategy_Interface {
		return $this->auth_strategy;
	}

	public function get_webhook_dispatcher(): AL_B2B_Webhook_Dispatcher {
		return $this->webhook_dispatcher;
	}

	/**
	 * Boot the plugin once. Idempotent: a second call is a no-op.
	 *
	 * Order:
	 *   1. Sub-phases 3d-3e register modules onto $this->modules.
	 *   2. Enabled modules attach hooks/routes to the loader.
	 *   3. The loader drains its queue into WordPress.
	 *
	 * The legacy monolithic registrations in `aesthetics-link-b2b-auth.php`
	 * continue to run alongside this until each responsibility is migrated.
	 */
	public function boot(): void {
		if ($this->booted) {
			return;
		}
		$this->booted = true;

		// Webhook retry handler. WP-Cron fires this for queued retry attempts.
		add_action(
			AL_B2B_Webhook_Dispatcher::RETRY_HOOK,
			array($this->webhook_dispatcher, 'try_dispatch'),
			10,
			3
		);

		// Auth REST routes (always on - auth is core).
		add_action('rest_api_init', array($this->auth_controller, 'register_routes'));

		// Feature modules. Each one is opt-in via config['modules']; the
		// registry only calls register() on those whose flag is true AND
		// whose own is_enabled() returns true.
		$this->modules->register(new AL_B2B_Module_Wholesale_Pricing());
		$this->modules->register(new AL_B2B_Module_Membership_Approval());
		$this->modules->register(new AL_B2B_Module_Newsletter());
		$this->modules->register(new AL_B2B_Module_Marketing_Events());
		$this->modules->register(new AL_B2B_Module_Reviews());
		$this->modules->register(new AL_B2B_Module_Checkout_Bridge());
		$this->modules->register(new AL_B2B_Module_Order_Receipt());

		$this->modules->boot_enabled();
		$this->loader->run();
	}

	/**
	 * Build the auth strategy instance based on `config['auth_strategy']`.
	 * Falls back to the opaque-session strategy on an unknown identifier so
	 * a typo in wp-config.php cannot lock everyone out.
	 */
	private function create_auth_strategy(): AL_B2B_Auth_Strategy_Interface {
		$strategy = $this->config['auth_strategy'] ?? 'opaque_session';
		switch ($strategy) {
			case 'jwt':
				return new AL_B2B_Auth_Jwt_Strategy();
			case 'opaque_session':
			default:
				return new AL_B2B_Auth_Opaque_Session_Strategy();
		}
	}
}
