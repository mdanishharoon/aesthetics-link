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
 *
 * The interface deliberately deals only in raw tokens and user IDs. Loading a
 * WP_User and shaping WP_Error responses is the caller's responsibility — keep
 * the strategy focused on the token lifecycle.
 */
interface AL_B2B_Auth_Strategy_Interface {

	/**
	 * Resolve a raw token (whatever the strategy emits from issue_session)
	 * to a WordPress user ID. Returns 0 for unknown / expired / malformed
	 * tokens. Must not throw.
	 */
	public function resolve_user_id_from_token(string $token): int;

	/**
	 * Issue a new session token for the given user. Returns the raw token to
	 * be sent back to the client, or null on failure.
	 */
	public function issue_session(int $user_id): ?string;

	/**
	 * Revoke the session represented by the raw token. Idempotent — a no-op
	 * if the token is unknown or already revoked.
	 *
	 * Stateless strategies (e.g. JWT) may treat this as a no-op and document
	 * the limitation; deployers needing per-token revocation should choose
	 * the opaque-session strategy.
	 */
	public function revoke_session(string $raw_token): void;

	/**
	 * Revoke every session belonging to the given user. Called from password
	 * reset to log the user out of every device.
	 */
	public function revoke_all_sessions(int $user_id): void;

	/**
	 * Garbage-collect expired/invalid sessions. Wired to the hourly cron in
	 * the main plugin file; idempotent.
	 */
	public function cleanup_expired(): void;
}
