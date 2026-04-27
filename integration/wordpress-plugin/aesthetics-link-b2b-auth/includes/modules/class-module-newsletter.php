<?php
/**
 * Newsletter module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Owns the newsletter subscriber lifecycle:
 *
 *   - REST endpoints: POST /newsletter/subscribe and POST /newsletter/webhook
 *     (Brevo event ingest with shared-secret verification).
 *   - Daily cron AL_B2B_INACTIVE_EVENT that marks 30-day-quiet subscribers
 *     as inactive and pushes the change to Brevo.
 *   - Marketing Controls admin page (newsletter status moderation).
 *
 * Brevo integration is the built-in driver. Per the Phase 3 plan every
 * subscribe/event also fires `do_action('al_b2b_newsletter_signup', $email,
 * $meta)` so additional listeners (Mailchimp, Klaviyo, custom CRM) can
 * subscribe to the same events; example listeners ship in 3e.
 *
 * Disabling the module:
 *   - The two REST routes disappear (404).
 *   - The Marketing Controls admin page is hidden.
 *   - The daily inactivity cron stops firing the Brevo sync (the cron
 *     event itself stays scheduled to keep activation/deactivation hooks
 *     deterministic, but the callback is no longer attached).
 */
class AL_B2B_Module_Newsletter implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'newsletter';
	}

	public function is_enabled(): bool {
		return true;
	}

	public function register(): void {
		add_action('rest_api_init', array($this, 'register_routes'));
		add_action(AL_B2B_INACTIVE_EVENT, 'al_b2b_mark_inactive_contacts');
		add_action('admin_menu', array($this, 'register_admin_menu'));
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/newsletter/subscribe', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_subscribe_newsletter',
			'permission_callback' => '__return_true',
		));

		register_rest_route('aesthetics-link/v1', '/newsletter/webhook', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_handle_brevo_webhook',
			'permission_callback' => '__return_true',
		));
	}

	public function register_admin_menu(): void {
		add_users_page(
			'Marketing Controls',
			'Marketing Controls',
			'promote_users',
			'al-b2b-marketing-reviews',
			'al_b2b_render_marketing_reviews_page'
		);
	}
}
