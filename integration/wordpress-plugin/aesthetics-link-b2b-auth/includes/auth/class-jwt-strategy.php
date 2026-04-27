<?php
/**
 * JWT auth strategy (alternative).
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Stateless JSON Web Token authentication using HMAC-SHA256 (HS256).
 *
 * Tokens are self-contained — no DB lookup on every request. Trade-off:
 * per-token revocation is impossible without an external blocklist, so
 * `revoke_session()` is a no-op and `revoke_all_sessions()` rotates the
 * user's per-account version (`al_b2b_jwt_token_version` user meta) so
 * tokens issued before the rotation are rejected on next verification.
 *
 * To enable this strategy, define in wp-config.php:
 *
 *   define('AL_B2B_AUTH_STRATEGY', 'jwt');
 *   define('AL_B2B_AUTH_JWT_SECRET', 'a-strong-random-secret');
 *
 * If you need a battle-tested JWT implementation (e.g. RS256 / multiple
 * keys / introspection endpoints), swap the body of this class for a call
 * into firebase/php-jwt. The interface contract is the same.
 */
class AL_B2B_Auth_Jwt_Strategy implements AL_B2B_Auth_Strategy_Interface {

	private const TOKEN_VERSION_META = 'al_b2b_jwt_token_version';

	public function resolve_user_id_from_token(string $token): int {
		$token = trim($token);
		if ($token === '') {
			return 0;
		}

		$payload = $this->verify($token);
		if (!is_array($payload)) {
			return 0;
		}

		$user_id = isset($payload['sub']) ? (int) $payload['sub'] : 0;
		if ($user_id <= 0) {
			return 0;
		}

		// Reject tokens issued before the user's last bulk-revocation.
		$expected_version = (int) get_user_meta($user_id, self::TOKEN_VERSION_META, true);
		$token_version    = isset($payload['ver']) ? (int) $payload['ver'] : 0;
		if ($token_version !== $expected_version) {
			return 0;
		}

		if (!get_user_by('id', $user_id)) {
			return 0;
		}

		return $user_id;
	}

	public function issue_session(int $user_id): ?string {
		if ($user_id <= 0) {
			return null;
		}

		$secret = $this->require_secret();
		if ($secret === null) {
			return null;
		}

		$now     = time();
		$version = (int) get_user_meta($user_id, self::TOKEN_VERSION_META, true);

		$header  = array('alg' => 'HS256', 'typ' => 'JWT');
		$payload = array(
			'iss' => home_url(),
			'sub' => $user_id,
			'iat' => $now,
			'exp' => $now + AL_B2B_SESSION_TTL,
			'ver' => $version,
		);

		$header_b64  = $this->base64url_encode(wp_json_encode($header));
		$payload_b64 = $this->base64url_encode(wp_json_encode($payload));
		$signature   = $this->sign("{$header_b64}.{$payload_b64}", $secret);

		return "{$header_b64}.{$payload_b64}.{$signature}";
	}

	/**
	 * Per-token revocation is not supported by stateless JWT. Use
	 * revoke_all_sessions() to roll the user's token version instead.
	 */
	public function revoke_session(string $raw_token): void {
		// Intentional no-op. See class docblock.
		unset($raw_token);
	}

	public function revoke_all_sessions(int $user_id): void {
		if ($user_id <= 0) {
			return;
		}
		$current = (int) get_user_meta($user_id, self::TOKEN_VERSION_META, true);
		update_user_meta($user_id, self::TOKEN_VERSION_META, $current + 1);
	}

	public function cleanup_expired(): void {
		// Stateless: nothing to clean up. Expiry is enforced on verify().
	}

	private function verify(string $token): ?array {
		$secret = $this->require_secret();
		if ($secret === null) {
			return null;
		}

		$parts = explode('.', $token);
		if (count($parts) !== 3) {
			return null;
		}
		[$header_b64, $payload_b64, $signature] = $parts;

		$expected_signature = $this->sign("{$header_b64}.{$payload_b64}", $secret);
		if (!hash_equals($expected_signature, $signature)) {
			return null;
		}

		$payload_json = $this->base64url_decode($payload_b64);
		if ($payload_json === null) {
			return null;
		}

		$payload = json_decode($payload_json, true);
		if (!is_array($payload)) {
			return null;
		}

		$exp = isset($payload['exp']) ? (int) $payload['exp'] : 0;
		if ($exp <= 0 || $exp < time()) {
			return null;
		}

		return $payload;
	}

	private function sign(string $signing_input, string $secret): string {
		$raw = hash_hmac('sha256', $signing_input, $secret, true);
		return $this->base64url_encode($raw);
	}

	private function base64url_encode(string $data): string {
		return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
	}

	private function base64url_decode(string $data): ?string {
		$remainder = strlen($data) % 4;
		if ($remainder !== 0) {
			$data .= str_repeat('=', 4 - $remainder);
		}
		$decoded = base64_decode(strtr($data, '-_', '+/'), true);
		return $decoded === false ? null : $decoded;
	}

	/**
	 * Returns the JWT secret, or null with a logged warning if it isn't
	 * configured. Returning null causes both issue and verify to fail
	 * closed, which is the safe behaviour when the strategy is mis-deployed.
	 */
	private function require_secret(): ?string {
		if (!defined('AL_B2B_AUTH_JWT_SECRET') || !AL_B2B_AUTH_JWT_SECRET) {
			if (defined('WP_DEBUG') && WP_DEBUG) {
				error_log('[al-b2b-auth] AL_B2B_AUTH_STRATEGY=jwt but AL_B2B_AUTH_JWT_SECRET is not defined.');
			}
			return null;
		}
		return (string) AL_B2B_AUTH_JWT_SECRET;
	}
}
