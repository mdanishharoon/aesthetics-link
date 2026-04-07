"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import { fetchCart, removeCartItem, updateCartItemQuantity } from "@/lib/storefront/client";
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

const CHECKOUT_URL = process.env.NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL?.trim() ?? "";

export default function CartPage() {
  const [cart, setCart] = useState<StorefrontCart>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshCart(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const nextCart = await fetchCart();
      setCart(nextCart);
    } catch (cartError) {
      setError(cartError instanceof Error ? cartError.message : "Unable to load your cart.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshCart();
  }, []);

  async function withCartMutation(action: () => Promise<void>): Promise<void> {
    if (busy) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await action();
      await refreshCart();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error ? mutationError.message : "Unable to update your cart.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleQuantityChange(key: string, nextQuantity: number): Promise<void> {
    await withCartMutation(async () => {
      await updateCartItemQuantity(key, Math.max(1, nextQuantity));
    });
  }

  async function handleRemoveItem(key: string): Promise<void> {
    await withCartMutation(async () => {
      await removeCartItem(key);
    });
  }

  function handleGoToCheckout(): void {
    if (!CHECKOUT_URL) {
      setError("Checkout URL is not configured. Set NEXT_PUBLIC_WOOCOMMERCE_CHECKOUT_URL.");
      return;
    }

    window.location.assign(CHECKOUT_URL);
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
              disabled={cart.items.length === 0 || !CHECKOUT_URL}
            >
              Proceed to Secure Checkout
            </button>

            <p style={{ fontSize: "0.8rem", color: "var(--color-gray2)", textAlign: "center", marginTop: "1rem" }}>
              Checkout is handled on your WooCommerce checkout subdomain.
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-gray2)", textAlign: "center", marginTop: "0.5rem" }}>
              Destination: {CHECKOUT_URL || "Not configured"}
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
