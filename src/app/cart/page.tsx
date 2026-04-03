"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import { useState } from "react";
import { products } from "@/data/products";

export default function CartPage() {
    // We mock a cart state using existing product data to make the UI look populated and beautiful
    const [cart, setCart] = useState([
        {
            ...products[0],
            qty: 1
        },
        {
            ...products[3],
            qty: 2
        }
    ]);

    const updateQty = (slug: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((i) => (i.slug === slug ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
        );
    };

    const removeItem = (slug: string) => {
        setCart((prev) => prev.filter(i => i.slug !== slug));
    };

    const subtotal = cart.reduce((sum, item) => {
        const priceNum = parseFloat(item.price.replace(/[^0-9.]/g, ""));
        return sum + (priceNum * item.qty);
    }, 0);

    const shipping = 5.00;
    const tax = subtotal * 0.2; // 20% mock tax
    const total = subtotal + shipping + tax;

    const currency = cart[0]?.price.match(/[^\d.]+/)?.[0] ?? "£";

    return (
        <div className="cart-page">
            <MotionProvider />
            <Header />

            <main className="container cart-layout">

                {/* ── LEFT: CART ITEMS ── */}
                <section className="cart-items-section reveal-up" data-reveal>
                    <div className="cart-header">
                        <h1 className="cart-title">Your Bag ({cart.length})</h1>
                    </div>

                    {cart.length === 0 ? (
                        <div style={{ padding: "4rem 0" }}>
                            <p style={{ fontSize: "1.2rem", color: "var(--color-gray2)", marginBottom: "2rem" }}>
                                Your bag is currently empty.
                            </p>
                            <a href="/products" className="btn" style={{ display: "inline-block" }}>Continue Shopping</a>
                        </div>
                    ) : (
                        <div className="cart-items-list">
                            {cart.map((item) => (
                                <div key={item.slug} className="cart-item">
                                    <img src={item.images.hero} alt={item.name} className="cart-item-image" style={{ background: item.accentBg }} />

                                    <div className="cart-item-details">
                                        <h3 className="cart-item-title">{item.shortName}</h3>
                                        <p className="cart-item-desc">{item.category}</p>

                                        <div className="cart-item-actions">
                                            <div className="cart-qty-toggle">
                                                <button className="cart-qty-btn" onClick={() => updateQty(item.slug, -1)}>−</button>
                                                <span>{item.qty}</span>
                                                <button className="cart-qty-btn" onClick={() => updateQty(item.slug, 1)}>+</button>
                                            </div>
                                            <button className="cart-remove-btn" onClick={() => removeItem(item.slug)}>Remove</button>
                                        </div>
                                    </div>

                                    <div className="cart-item-price">
                                        {currency}{(parseFloat(item.price.replace(/[^0-9.]/g, "")) * item.qty).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ── RIGHT: SUMMARY & CHECKOUT ── */}
                <section className="cart-checkout-section reveal-up" data-reveal>
                    <div className="cart-summary-wrapper">
                        <h2 className="cart-summary-title">Order Summary</h2>

                        <div className="cart-summary-row">
                            <span>Subtotal</span>
                            <span>{currency}{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="cart-summary-row">
                            <span>Estimated Shipping</span>
                            <span>{currency}{shipping.toFixed(2)}</span>
                        </div>
                        <div className="cart-summary-row">
                            <span>Estimated Tax</span>
                            <span>{currency}{tax.toFixed(2)}</span>
                        </div>

                        <div className="cart-summary-total">
                            <span>Total</span>
                            <span>{currency}{total.toFixed(2)}</span>
                        </div>

                        <form className="cart-checkout-form" onSubmit={(e) => { e.preventDefault(); alert("Proceeding to payment gateway..."); }}>
                            <div className="checkout-input-group">
                                <label className="checkout-label">Contact Email</label>
                                <input type="email" className="checkout-input" placeholder="Enter your email" required />
                            </div>

                            <div className="checkout-input-group" style={{ marginTop: "1rem" }}>
                                <label className="checkout-label">Card Details</label>
                                <input type="text" className="checkout-input" placeholder="0000 0000 0000 0000" maxLength={19} required />
                            </div>

                            <div style={{ display: "flex", gap: "1rem" }}>
                                <div className="checkout-input-group" style={{ flex: 1 }}>
                                    <input type="text" className="checkout-input" placeholder="MM/YY" maxLength={5} required />
                                </div>
                                <div className="checkout-input-group" style={{ flex: 1 }}>
                                    <input type="text" className="checkout-input" placeholder="CVC" maxLength={4} required />
                                </div>
                            </div>

                            <button type="submit" className="checkout-btn">Submit Order ➔</button>
                        </form>

                        <p style={{ fontSize: "0.8rem", color: "var(--color-gray2)", textAlign: "center", marginTop: "1.5rem" }}>
                            Secure checkout encrypted via SSL. Total includes all applicable duties.
                        </p>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
