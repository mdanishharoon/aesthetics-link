<?php
/**
 * Marketing events module.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Owns the storefront's analytics ingest endpoint.
 *
 *   POST /aesthetics-link/v1/marketing/track
 *
 * The frontend posts pageview / product-view / signup-opt-in / etc.
 * events; the plugin records each into wp_al_b2b_marketing_events and
 * upserts a contact row in wp_al_b2b_newsletter_subscribers (if an email
 * is provided) plus syncs the contact attributes to Brevo when configured.
 *
 * The DB schema and the Brevo sync helpers are shared with the Newsletter
 * module - keeping events-tracking and newsletter as separate togglable
 * modules lets a deployer disable analytics collection without losing
 * subscriber management, or vice versa.
 *
 * Disabling this module: the /marketing/track endpoint disappears; the
 * frontend should no-op its tracking calls. Existing event rows in the
 * DB are untouched.
 */
class AL_B2B_Module_Marketing_Events implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'marketing_events';
	}

	public function is_enabled(): bool {
		return true;
	}

	public function register(): void {
		add_action('rest_api_init', array($this, 'register_routes'));
	}

	public function register_routes(): void {
		register_rest_route('aesthetics-link/v1', '/marketing/track', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_track_marketing_event',
			'permission_callback' => '__return_true',
		));
	}
}
