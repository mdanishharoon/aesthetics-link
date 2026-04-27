<?php
/**
 * Outbound webhook dispatcher with HMAC signing and WP-Cron retries.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Push events from the plugin to a downstream consumer (typically the
 * Next.js storefront's webhook receiver).
 *
 * Payload shape on the wire:
 *   {
 *     "event":    "stock.updated",
 *     "payload":  { ... event-specific JSON ... },
 *     "sent_at":  1714291200
 *   }
 *
 * Headers:
 *   Content-Type:        application/json
 *   X-AL-B2B-Event:      <event id>
 *   X-AL-B2B-Signature:  hash_hmac('sha256', $body_json, $secret)
 *
 * Retry policy: up to `config['webhooks']['max_attempts']` total tries
 * with backoff `config['webhooks']['backoff_seconds']` (per-attempt delay
 * in seconds). Retries are queued via `wp_schedule_single_event`, so a
 * deployment with WP-Cron disabled (`DISABLE_WP_CRON`) needs to wire its
 * own runner.
 *
 * Observability hooks:
 *   do_action('al_b2b_webhook_dispatched', $event, $status_code, $attempt)
 *   do_action('al_b2b_webhook_failed',     $event, $payload, $error_message)
 */
class AL_B2B_Webhook_Dispatcher {

	public const RETRY_HOOK = 'al_b2b_webhook_retry';

	private array $config;

	public function __construct(array $config) {
		$this->config = $config;
	}

	/**
	 * Enqueue an event for delivery. Returns true on immediate success,
	 * false when delivery is pending retry or the dispatcher is misconfigured.
	 */
	public function dispatch(string $event, array $payload): bool {
		return $this->try_dispatch($event, $payload, 1);
	}

	/**
	 * Internal — fires one delivery attempt. Public for the WP-Cron retry
	 * hook to call directly; outside the dispatcher, prefer `dispatch()`.
	 */
	public function try_dispatch(string $event, array $payload, int $attempt = 1): bool {
		$url    = (string) ($this->config['target_url'] ?? '');
		$secret = (string) ($this->config['secret'] ?? '');

		if ($url === '' || $secret === '') {
			$this->log_debug(sprintf(
				'dispatch skipped: missing target_url or secret (event=%s)',
				$event
			));
			return false;
		}

		$body_json = wp_json_encode(array(
			'event'   => $event,
			'payload' => $payload,
			'sent_at' => time(),
		));

		if (!is_string($body_json)) {
			$this->log_debug(sprintf(
				'dispatch skipped: payload not JSON-serialisable (event=%s)',
				$event
			));
			return false;
		}

		$signature = hash_hmac('sha256', $body_json, $secret);

		$response = wp_remote_post($url, array(
			'timeout'  => 10,
			'blocking' => true,
			'headers'  => array(
				'Content-Type'        => 'application/json',
				'Accept'              => 'application/json',
				'X-AL-B2B-Event'      => $event,
				'X-AL-B2B-Signature'  => $signature,
				'X-AL-B2B-Attempt'    => (string) $attempt,
			),
			'body'     => $body_json,
		));

		if (is_wp_error($response)) {
			return $this->handle_failure($event, $payload, $attempt, $response->get_error_message());
		}

		$status = (int) wp_remote_retrieve_response_code($response);
		if ($status >= 200 && $status < 300) {
			do_action('al_b2b_webhook_dispatched', $event, $status, $attempt);
			return true;
		}

		return $this->handle_failure($event, $payload, $attempt, "HTTP {$status}");
	}

	private function handle_failure(string $event, array $payload, int $attempt, string $error): bool {
		$max_attempts = (int) ($this->config['max_attempts'] ?? 3);

		if ($attempt < $max_attempts) {
			$delay = $this->backoff_for_attempt($attempt);
			wp_schedule_single_event(
				time() + $delay,
				self::RETRY_HOOK,
				array($event, $payload, $attempt + 1)
			);
			$this->log_debug(sprintf(
				'dispatch attempt %d/%d failed (event=%s, error=%s); retrying in %ds',
				$attempt, $max_attempts, $event, $error, $delay
			));
			return false;
		}

		do_action('al_b2b_webhook_failed', $event, $payload, $error);
		$this->log_debug(sprintf(
			'dispatch giving up after %d attempts (event=%s, error=%s)',
			$attempt, $event, $error
		));
		return false;
	}

	private function backoff_for_attempt(int $attempt): int {
		$schedule = $this->config['backoff_seconds'] ?? array(0, 30, 120);
		if (!is_array($schedule) || count($schedule) === 0) {
			return 0;
		}
		// $attempt is 1-indexed; we want the delay BEFORE attempt N+1, so
		// look up index = $attempt (which is "next attempt index minus one"
		// because backoff[0] precedes attempt 2, etc.). Cap at last entry.
		$index = min($attempt, count($schedule) - 1);
		return (int) ($schedule[$index] ?? 0);
	}

	private function log_debug(string $message): void {
		if (defined('WP_DEBUG') && WP_DEBUG) {
			error_log('[al-b2b-webhook] ' . $message);
		}
	}
}
