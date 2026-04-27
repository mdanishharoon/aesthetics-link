<?php
/**
 * Base REST controller.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Common scaffolding for the plugin's REST controllers.
 *
 * Phase 3a/3b ships only the auth-related helpers; subsequent sub-phases
 * grow the surface (rate-limit hooks, schema-driven argument validation,
 * etc.). Each REST controller subclasses this base and registers its
 * routes via {@see register_routes()} on `rest_api_init`.
 */
abstract class AL_B2B_Base_REST_Controller {

	protected AL_B2B_Auth_Strategy_Interface $auth;

	public function __construct(AL_B2B_Auth_Strategy_Interface $auth) {
		$this->auth = $auth;
	}

	/**
	 * Subclasses register their routes here. Wire to `rest_api_init`.
	 */
	abstract public function register_routes(): void;

	/**
	 * Permission callback that allows any caller (use sparingly — pair
	 * with rate-limiting + captcha for unauthenticated write endpoints).
	 */
	protected function permission_public(): callable {
		return '__return_true';
	}

	/**
	 * Permission callback that requires a valid Bearer token resolving to
	 * a WordPress user. Returns WP_Error(401) otherwise so callers don't
	 * need to repeat the check inside every handler.
	 */
	protected function permission_authenticated(): callable {
		$auth = $this->auth;
		return static function ($request) use ($auth) {
			$token = self::extract_bearer_from_request($request);
			if ($token === '') {
				return new WP_Error('unauthorized', 'Not authenticated.', array('status' => 401));
			}
			$user_id = $auth->resolve_user_id_from_token($token);
			if ($user_id <= 0) {
				return new WP_Error('unauthorized', 'Session expired or invalid.', array('status' => 401));
			}
			return true;
		};
	}

	/**
	 * Resolve the authenticated user from the request, or null. Use inside
	 * a handler whose `permission_callback` is {@see permission_authenticated()}
	 * — by then we've already validated, so this should never return null in
	 * practice, but defensive callers can still check.
	 */
	protected function get_current_user(WP_REST_Request $request): ?WP_User {
		$token = self::extract_bearer_from_request($request);
		if ($token === '') {
			return null;
		}
		$user_id = $this->auth->resolve_user_id_from_token($token);
		if ($user_id <= 0) {
			return null;
		}
		$user = get_user_by('id', $user_id);
		return $user instanceof WP_User ? $user : null;
	}

	/**
	 * Extract a bearer token from a WP_REST_Request's Authorization header.
	 * Returns '' when the header is absent or malformed.
	 */
	public static function extract_bearer_from_request($request): string {
		if (!$request instanceof WP_REST_Request) {
			return '';
		}
		$header = (string) $request->get_header('authorization');
		return self::extract_bearer_from_header($header);
	}

	/**
	 * Extract a bearer token from a raw Authorization header value. Used by
	 * non-REST hooks (Store API filter) that don't have a WP_REST_Request.
	 */
	public static function extract_bearer_from_header(string $header_value): string {
		$header_value = trim($header_value);
		if ($header_value === '') {
			return '';
		}
		if (!preg_match('/Bearer\s+(.+)$/i', $header_value, $matches)) {
			return '';
		}
		return trim((string) $matches[1]);
	}
}
