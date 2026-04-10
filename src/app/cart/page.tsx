"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import {
  fetchCart,
  getCachedCartSnapshot,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/storefront/client";
import type { StorefrontCart } from "@/lib/storefront/types";
import Link from "next/link";
import { useEffect, useState } from "react";

const EMPTY_CART: StorefrontCart = {
  items: [],
  itemCount: 0,
  subtotal: "$0.00",
  shipping: "$0.00",
  tax: "$0.00",
  total: "$0.00",
  currencySymbol: "$",
  needsShipping: false,
};

export default function CartPage() {
  const [initialCachedCart] = useState<StorefrontCart | null>(() => getCachedCartSnapshot());
  const [cart, setCart] = useState<StorefrontCart>(initialCachedCart ?? EMPTY_CART);
  const [loading, setLoading] = useState(initialCachedCart === null);
  const [hasLiveCart, setHasLiveCart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshCart(showLoadingState = true): Promise<void> {
    if (showLoadingState) {
      setLoading(true);
    }
    setError(null);
    try {
      const nextCart = await fetchCart();
      setCart(nextCart);
      setHasLiveCart(true);
    } catch (cartError) {
      setError(cartError instanceof Error ? cartError.message : "Unable to load your cart.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshCart(initialCachedCart === null);
  }, [initialCachedCart]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutError = params.get("checkout_error");
    if (checkoutError) {
      const checkoutErrorMessages: Record<string, string> = {
        bridge_unavailable: "Checkout bridge is temporarily unavailable. Please try again in a moment.",
        missing_cart_token: "Your checkout session expired. Please refresh your bag before continuing.",
        bridge_identity_unavailable:
          "We could not verify your account context for checkout. Please refresh and try again.",
        bridge_invalid: "The checkout handoff was invalid. Please try again from your bag.",
        bridge_crashed: "Checkout failed during handoff. Please try again in a moment.",
        bridge_sync_failed: "We could not sync your bag into checkout. Please try again.",
        bridge_cart_mismatch:
          "Your bag changed during checkout handoff. Please review it and try again.",
        store_cart_unavailable:
          "We could not read your current bag from WooCommerce. Please try again in a moment.",
        store_cart_empty: "Your bag is empty. Add items before proceeding to checkout.",
        wc_cart_unavailable:
          "WooCommerce checkout is not ready right now. Please try again in a moment.",
        woocommerce_unavailable:
          "WooCommerce checkout is not available right now. Please try again in a moment.",
        bridge_user_invalid:
          "Your account context could not be restored for checkout. Please sign in again.",
      };
      setError(
        checkoutErrorMessages[checkoutError] ??
          "Checkout could not be started. Please review your bag and try again.",
      );
      params.delete("checkout_error");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`;
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, []);

  async function withCartMutation(action: () => Promise<StorefrontCart>): Promise<void> {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const nextCart = await action();
      setCart(nextCart);
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Unable to update your cart.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleQuantityChange(key: string, nextQuantity: number): Promise<void> {
    await withCartMutation(() => updateCartItemQuantity(key, Math.max(1, nextQuantity)));
  }

  async function handleRemoveItem(key: string): Promise<void> {
    await withCartMutation(() => removeCartItem(key));
  }

  function handleGoToCheckout(): void {
    window.location.assign("/api/checkout/bridge");
  }

  return (
    <div className="cart-page">
      <MotionProvider />
      <Header />

      <main className="container cart-layout">
        <section className="cart-items-section reveal-up" data-reveal>
          <div className="cart-header">
            <h1 className="cart-title">Your Bag ({cart.itemCount})</h1>
          </div>

          {loading ? (
            <p style={{ color: "var(--color-gray2)" }}>Loading your bag...</p>
          ) : cart.items.length === 0 ? (
            <div style={{ padding: "4rem 0" }}>
              <p style={{ fontSize: "1.2rem", color: "var(--color-gray2)", marginBottom: "2rem" }}>
                Your bag is currently empty.
              </p>
              <Link href="/products" className="btn" style={{ display: "inline-block" }}>
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.items.map((item) => (
                <div key={item.key} className="cart-item">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    className="cart-item-image"
                    style={{ background: item.accentBg }}
                  />

                  <div className="cart-item-details">
                    <h3 className="cart-item-title">{item.shortName}</h3>
                    <p className="cart-item-desc">{item.name}</p>
                    {item.variations.length > 0 ? (
                      <ul className="cart-item-variations" aria-label="Selected options">
                        {item.variations.map((variation) => (
                          <li key={`${item.key}:${variation.label}:${variation.value}`}>
                            <span>{variation.label}:</span> {variation.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="cart-item-actions">
                      <div className="cart-qty-toggle">
                        <button
                          className="cart-qty-btn"
                          onClick={() => handleQuantityChange(item.key, item.quantity - 1)}
                          disabled={busy}
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          className="cart-qty-btn"
                          onClick={() => handleQuantityChange(item.key, item.quantity + 1)}
                          disabled={busy}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="cart-remove-btn"
                        onClick={() => handleRemoveItem(item.key)}
                        disabled={busy}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="cart-item-price">{item.lineTotal}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="cart-checkout-section reveal-up" data-reveal>
          <div className="cart-summary-wrapper">
            <h2 className="cart-summary-title">Order Summary</h2>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>{cart.subtotal}</span>
            </div>
            <div className="cart-summary-row">
              <span>Estimated Shipping</span>
              <span>{cart.shipping}</span>
            </div>
            <div className="cart-summary-row">
              <span>Estimated Tax</span>
              <span>{cart.tax}</span>
            </div>

            <div className="cart-summary-total">
              <span>Total</span>
              <span>{cart.total}</span>
            </div>

            <button
              type="button"
              className="checkout-btn"
              onClick={handleGoToCheckout}
              disabled={cart.items.length === 0 || loading || busy || !hasLiveCart}
            >
              Proceed to Secure Checkout
            </button>

            <p style={{ fontSize: "0.8rem", color: "var(--color-gray2)", textAlign: "center", marginTop: "1rem" }}>
              You will be redirected to secure checkout to complete payment.
            </p>

            {error ? (
              <p style={{ fontSize: "0.85rem", color: "#b04545", textAlign: "center", marginTop: "1rem" }}>
                {error}
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
