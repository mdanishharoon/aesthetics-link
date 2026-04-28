<?php
/**
 * Subscriptions module — STUB.
 *
 * @package AestheticsLink\B2BAuth
 */

defined('ABSPATH') || exit;

/**
 * Stub module that documents how to integrate WooCommerce Subscriptions
 * with the headless storefront. No logic ships here yet — a deployer who
 * needs subscription management drops the WooCommerce Subscriptions
 * extension into their site, enables this module, and then implements
 * the marked TODOs.
 *
 * Endpoints to implement:
 *
 *   GET  /aesthetics-link/v1/subscriptions
 *   GET  /aesthetics-link/v1/subscriptions/{id}
 *   POST /aesthetics-link/v1/subscriptions/{id}/pause
 *   POST /aesthetics-link/v1/subscriptions/{id}/cancel
 *
 * WooCommerce Subscriptions hook reference:
 *
 *   - woocommerce_subscription_status_updated  (lifecycle changes)
 *   - woocommerce_scheduled_subscription_payment  (renewal cycle)
 *   - woocommerce_subscriptions_renewal_order_created (new order from renewal)
 *
 * The {@see WC_Subscription} class exposes get_status(), get_billing_period(),
 * get_next_payment_date(), update_status('on-hold'|'cancelled'), etc.
 *
 * Dispatching webhooks for renewals: the Phase 3c
 * AL_B2B_Webhook_Dispatcher is the right home — wire it on
 * woocommerce_subscriptions_renewal_order_created with event
 * 'subscription.renewal'.
 */
class AL_B2B_Module_Subscriptions implements AL_B2B_Module_Interface {

	public function get_id(): string {
		return 'subscriptions';
	}

	public function is_enabled(): bool {
		// WooCommerce Subscriptions registers WC_Subscriptions on init.
		return class_exists('WC_Subscriptions');
	}

	public function register(): void {
		// TODO: hook woocommerce_subscription_status_updated and dispatch
		//       'subscription.status_changed' via the webhook dispatcher.
		// TODO: register the four endpoints listed in the class docblock.
		// Intentional no-op until a deployer fills these in.
	}
}
