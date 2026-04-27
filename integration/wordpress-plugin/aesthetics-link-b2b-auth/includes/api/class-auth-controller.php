<?php
/**
 * Auth REST controller (always loaded — auth is core, not a module).
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Owns the /aesthetics-link/v1/auth/* surface.
 *
 * Phase 3d migrates the 12 auth route registrations out of
 * `al_b2b_register_routes()` and into this controller. The route handlers
 * themselves are still the existing global functions (`al_b2b_register_user`,
 * `al_b2b_login_user`, etc.) — those move into class methods in a later
 * cleanup pass. Behaviour is identical.
 *
 * Permission callbacks remain `__return_true` here to preserve current
 * behaviour. Tightening to `permission_authenticated()` for the
 * already-authenticated routes (me, dashboard, order, orders, profile,
 * wholesale-prices) is part of sub-phase 3g (security hardening), where
 * we can audit each callback for double-auth at the same time.
 */
class AL_B2B_Auth_Controller extends AL_B2B_Base_REST_Controller {

	private const NAMESPACE_V1 = 'aesthetics-link/v1';

	public function register_routes(): void {
		$ns = self::NAMESPACE_V1;
		$public = $this->permission_public();

		register_rest_route($ns, '/auth/register', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_register_user',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/login', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_login_user',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/me', array(
			'methods'             => 'GET',
			'callback'            => 'al_b2b_get_me',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/dashboard', array(
			'methods'             => 'GET',
			'callback'            => 'al_b2b_get_account_dashboard',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/order', array(
			'methods'             => 'GET',
			'callback'            => 'al_b2b_get_authenticated_order_detail',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/logout', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_logout_user',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/request-email-verification', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_request_email_verification',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/verify-email', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_verify_email',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/request-password-reset', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_request_password_reset',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/reset-password', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_reset_password',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/profile', array(
			'methods'             => 'POST',
			'callback'            => 'al_b2b_update_profile',
			'permission_callback' => $public,
		));

		register_rest_route($ns, '/auth/orders', array(
			'methods'             => 'GET',
			'callback'            => 'al_b2b_get_account_orders',
			'permission_callback' => $public,
		));
	}
}
