<?php
/**
 * Authentication strategy interface.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Pluggable authentication mechanism for the headless storefront.
 *
 * Two implementations ship: the default opaque-session strategy (server-issued
 * tokens hashed in a custom DB table, revocable) and a JWT alternative for
 * deployers who prefer stateless tokens. Selection is config-driven via the
 * `auth_strategy` key.
 */
interface AL_B2B_Auth_Strategy_Interface {

	/**
	 * Inspect the request and return the WordPress user ID it represents,
	 * or 0 for an unauthenticated/invalid request. Should not throw.
	 *
	 * @param WP_REST_Request|null $request The current request, if available.
	 *                                       The Store-API auth bridge calls
	 *                                       this with null to operate on
	 *                                       globals.
	 * @return int WordPress user ID or 0.
	 */
	public function resolve_user_id($request): int;

	/**
	 * Issue a session token for a freshly authenticated user. Returns the
	 * raw token to send back to the client, or null on failure.
	 */
	public function issue_session(int $user_id): ?string;

	/**
	 * Revoke the session represented by the given raw token (idempotent —
	 * no-op if the token is unknown or already revoked).
	 */
	public function revoke_session(string $raw_token): void;

	/**
	 * Revoke every session belonging to a user. Called from password reset
	 * to invalidate other devices.
	 */
	public function revoke_all_sessions(int $user_id): void;
}
