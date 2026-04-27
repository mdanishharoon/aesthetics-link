<?php
/**
 * Membership approval module (formerly clinic approval).
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Owns the admin workflow for vetting B2B / wholesale account applications:
 * the Clinic Applications page, the approve/reject decision audit log, and
 * the corresponding role transitions.
 *
 * Role names are configurable via the plugin config so a deployer can use
 * generic terms without renaming user records:
 *
 *   define('AL_B2B_ROLE_PENDING',  'pending_member');
 *   define('AL_B2B_ROLE_APPROVED', 'wholesale_customer');
 *
 * The module's REST surface is empty — approvals only happen from the WP
 * admin UI; no JSON API for now (a future phase can expose one).
 *
 * The cross-module al_b2b_handle_admin_actions dispatcher remains
 * registered from the monolith bootstrap because it also services the
 * Newsletter module's marketing actions; menu visibility gates which
 * actions a privileged user can trigger via the UI.
 */
class AL_B2B_Module_Membership_Approval implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'membership_approval';
	}

	public function is_enabled(): bool {
		return true;
	}

	public function register(): void {
		add_action('admin_menu', array($this, 'register_admin_menu'));
	}

	public function register_admin_menu(): void {
		add_users_page(
			'Clinic Applications',
			'Clinic Applications',
			'promote_users',
			'al-b2b-clinic-applications',
			'al_b2b_render_clinic_applications_page'
		);
	}
}
