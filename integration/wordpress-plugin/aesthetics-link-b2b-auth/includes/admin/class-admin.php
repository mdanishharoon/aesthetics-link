<?php
/**
 * Admin settings page.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Renders the plugin's settings page under Settings -> AL B2B.
 *
 * The page is a single-form, multi-section layout backed by the WordPress
 * Settings API. Constant overrides defined in wp-config.php (for secrets
 * and other security-sensitive values) take precedence over the saved
 * option; the UI marks affected fields read-only with a clear notice.
 *
 * Phase 3f scope: get the page on screen with every relevant knob exposed.
 * Polish (tabs, AJAX validation, secret rotation flow) is deferred —
 * Settings API + a sectioned form is enough for a deployer to operate
 * the plugin without editing wp-config.php for non-secret values.
 */
class AL_B2B_Admin {

	public const PAGE_SLUG = 'al-b2b-settings';

	public function register(): void {
		add_action('admin_menu', array($this, 'register_menu'));
		add_action('admin_init', array($this, 'register_settings'));
	}

	public function register_menu(): void {
		add_options_page(
			'AestheticsLink B2B',
			'AL B2B',
			'manage_options',
			self::PAGE_SLUG,
			array($this, 'render_page')
		);
	}

	public function register_settings(): void {
		register_setting(
			AL_B2B_Settings::SETTINGS_GROUP,
			AL_B2B_Settings::OPTION_KEY,
			array(
				'type'              => 'array',
				'sanitize_callback' => array('AL_B2B_Settings', 'sanitize'),
				'default'           => AL_B2B_Settings::defaults(),
			)
		);

		add_settings_section(
			'al_b2b_general',
			'General',
			static function () {
				echo '<p>Endpoint and branding details for the headless storefront.</p>';
			},
			self::PAGE_SLUG
		);
		$this->add_text_field('frontend_url', 'Frontend URL', 'al_b2b_general', 'https://store.example.com');

		add_settings_section(
			'al_b2b_auth',
			'Authentication',
			static function () {
				echo '<p>Choose how the plugin issues session tokens. The opaque-session strategy is recommended; JWT is provided for deployers that prefer stateless tokens.</p>';
			},
			self::PAGE_SLUG
		);
		$this->add_strategy_field('auth_strategy', 'al_b2b_auth');
		$this->add_text_field('jwt_secret', 'JWT secret', 'al_b2b_auth', 'Required only when strategy is "jwt"', true);

		add_settings_section(
			'al_b2b_webhooks',
			'Outbound webhooks',
			static function () {
				echo '<p>Where to send <code>stock.updated</code>, <code>cart.abandoned</code>, and other event payloads. Both fields must be set or the dispatcher silently skips delivery.</p>';
			},
			self::PAGE_SLUG
		);
		$this->add_text_field('webhook_target_url', 'Target URL', 'al_b2b_webhooks', 'https://store.example.com/api/webhooks/al-b2b');
		$this->add_text_field('webhook_secret', 'HMAC secret', 'al_b2b_webhooks', 'Shared secret used to sign every outbound payload', true);

		add_settings_section(
			'al_b2b_newsletter',
			'Newsletter driver',
			static function () {
				echo '<p>Which CRM gets newsletter signups synced into. Regardless of driver, every signup also fires <code>do_action(\'al_b2b_newsletter_signup\', $email, $meta)</code> for additional listeners.</p>';
			},
			self::PAGE_SLUG
		);
		$this->add_newsletter_driver_field('newsletter_driver', 'al_b2b_newsletter');

		add_settings_section(
			'al_b2b_modules',
			'Modules',
			static function () {
				echo '<p>Toggle individual feature modules. Disabling a module removes its REST routes, hooks, and admin pages without touching its data.</p>';
			},
			self::PAGE_SLUG
		);
		$this->add_module_toggles_field('al_b2b_modules');
	}

	public function render_page(): void {
		if (!current_user_can('manage_options')) {
			return;
		}
		?>
		<div class="wrap">
			<h1>AestheticsLink B2B Auth</h1>
			<form action="options.php" method="post">
				<?php
				settings_fields(AL_B2B_Settings::SETTINGS_GROUP);
				do_settings_sections(self::PAGE_SLUG);
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	private function add_text_field(string $key, string $label, string $section, string $placeholder = '', bool $is_secret = false): void {
		add_settings_field(
			$key,
			esc_html($label),
			function () use ($key, $placeholder, $is_secret) {
				$settings = AL_B2B_Settings::get();
				$value    = isset($settings[$key]) ? (string) $settings[$key] : '';
				$override = AL_B2B_Settings::constant_override($key);
				$name     = AL_B2B_Settings::OPTION_KEY . '[' . $key . ']';
				$type     = $is_secret ? 'password' : 'text';

				if ($override !== null) {
					printf(
						'<input type="%1$s" disabled value="%2$s" class="regular-text" />
						 <p class="description">%3$s</p>',
						esc_attr($type),
						esc_attr($is_secret ? str_repeat('•', 12) : $override),
						esc_html__('Overridden by wp-config.php constant.', 'default')
					);
					return;
				}

				printf(
					'<input type="%1$s" name="%2$s" value="%3$s" placeholder="%4$s" class="regular-text" autocomplete="off" />',
					esc_attr($type),
					esc_attr($name),
					esc_attr($value),
					esc_attr($placeholder)
				);
			},
			self::PAGE_SLUG,
			$section
		);
	}

	private function add_strategy_field(string $key, string $section): void {
		add_settings_field(
			$key,
			'Strategy',
			function () use ($key) {
				$settings = AL_B2B_Settings::get();
				$value    = $settings[$key] ?? 'opaque_session';
				$override = AL_B2B_Settings::constant_override($key);
				$name     = AL_B2B_Settings::OPTION_KEY . '[' . $key . ']';
				$disabled = $override !== null ? ' disabled' : '';
				$current  = $override !== null ? $override : $value;
				?>
				<label><input type="radio" name="<?php echo esc_attr($name); ?>" value="opaque_session" <?php checked($current, 'opaque_session'); ?> <?php echo $disabled; // phpcs:ignore WordPress.Security.EscapeOutput ?> /> Opaque session (recommended)</label><br />
				<label><input type="radio" name="<?php echo esc_attr($name); ?>" value="jwt" <?php checked($current, 'jwt'); ?> <?php echo $disabled; // phpcs:ignore WordPress.Security.EscapeOutput ?> /> JWT (stateless)</label>
				<?php if ($override !== null): ?>
					<p class="description">Overridden by wp-config.php constant.</p>
				<?php endif;
			},
			self::PAGE_SLUG,
			$section
		);
	}

	private function add_newsletter_driver_field(string $key, string $section): void {
		add_settings_field(
			$key,
			'Driver',
			function () use ($key) {
				$settings = AL_B2B_Settings::get();
				$value    = $settings[$key] ?? 'brevo';
				$override = AL_B2B_Settings::constant_override($key);
				$name     = AL_B2B_Settings::OPTION_KEY . '[' . $key . ']';
				$disabled = $override !== null ? ' disabled' : '';
				$current  = $override !== null ? $override : $value;
				?>
				<select name="<?php echo esc_attr($name); ?>" <?php echo $disabled; // phpcs:ignore WordPress.Security.EscapeOutput ?>>
					<option value="brevo" <?php selected($current, 'brevo'); ?>>Brevo (built-in)</option>
					<option value="none"  <?php selected($current, 'none'); ?>>None — fire action hook only</option>
				</select>
				<?php if ($override !== null): ?>
					<p class="description">Overridden by wp-config.php constant.</p>
				<?php endif;
			},
			self::PAGE_SLUG,
			$section
		);
	}

	private function add_module_toggles_field(string $section): void {
		add_settings_field(
			'modules',
			'Toggles',
			function () {
				$settings = AL_B2B_Settings::get();
				$flags    = isset($settings['modules']) && is_array($settings['modules']) ? $settings['modules'] : array();
				$base     = AL_B2B_Settings::OPTION_KEY . '[modules]';
				echo '<fieldset>';
				foreach (AL_B2B_Settings::default_module_flags() as $id => $default_state) {
					$checked = !empty($flags[$id]);
					$name    = $base . '[' . $id . ']';
					printf(
						'<label style="display:block; margin-bottom: 0.25rem;">
							<input type="checkbox" name="%1$s" value="1" %2$s />
							<code>%3$s</code>
						</label>',
						esc_attr($name),
						checked($checked, true, false),
						esc_html($id)
					);
				}
				echo '</fieldset>';
			},
			self::PAGE_SLUG,
			$section
		);
	}
}
