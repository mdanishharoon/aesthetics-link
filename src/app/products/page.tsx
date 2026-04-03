"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import { products } from "@/data/products";
import Link from "next/link";
import { useState, useRef } from "react";

/* ─── Icons ─────────────────────────────────────────────────────── */

function QuickCartIcon() {
    return (
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <circle cx="13" cy="13" r="13" fill="white" />
            <path
                d="M8.77357 10.7989C8.81474 10.099 9.39438 9.55243 10.0955 9.55243H16.0403C16.7415 9.55243 17.3211 10.099 17.3623 10.7989L17.7342 17.1212C17.779 17.8819 17.1742 18.5233 16.4122 18.5233H9.72364C8.9617 18.5233 8.35692 17.8819 8.40167 17.1212L8.77357 10.7989Z"
                stroke="#424242"
                strokeWidth="0.6"
            />
            <path
                d="M15.883 10.9417C15.883 8.76477 14.6224 7 13.0675 7C11.5125 7 10.252 8.76477 10.252 10.9417"
                stroke="#424242"
                strokeWidth="0.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

function FilterIcon() {
    return (
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="1.2" />
            <line x1="3" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.2" />
            <line x1="6" y1="11" x2="10" y2="11" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    );
}

function CartIcon() {
    return (
        <svg width="15" height="18" viewBox="0 0 15 18" fill="none">
            <path
                d="M1.19891 5.8049C1.2448 5.02484 1.89076 4.41576 2.67216 4.41576H12.0298C12.8112 4.41576 13.4572 5.02485 13.5031 5.8049L14.0884 15.7547C14.1382 16.6023 13.4643 17.3171 12.6151 17.3171H2.08688C1.23775 17.3171 0.563767 16.6023 0.61363 15.7547L1.19891 5.8049Z"
                stroke="currentColor"
                strokeWidth="0.98"
            />
            <path
                d="M11.4354 6.3737C11.4354 3.21604 9.60694 0.65625 7.35147 0.65625C5.096 0.65625 3.26758 3.21604 3.26758 6.3737"
                stroke="currentColor"
                strokeWidth="0.98"
                strokeLinecap="round"
            />
        </svg>
    );
}

/* ─── Cart types ─────────────────────────────────────────────────── */
type CartItem = { slug: string; name: string; price: string; qty: number; accentBg: string };

/* ─── Cart Sidebar ───────────────────────────────────────────────── */
function CartSidebar({
    items,
    onClose,
    onRemove,
    onQty,
}: {
    items: CartItem[];
    onClose: () => void;
    onRemove: (slug: string) => void;
    onQty: (slug: string, delta: number) => void;
}) {
    const total = items.reduce((sum, it) => {
        const num = parseFloat(it.price.replace(/[^0-9.]/g, ""));
        return sum + num * it.qty;
    }, 0);
    const currency = items[0]?.price.match(/[^\d.]+/)?.[0] ?? "£";

    return (
        <div className="shop-cart-overlay" onClick={onClose}>
            <div className="shop-cart-sidebar" onClick={(e) => e.stopPropagation()}>
                <div className="shop-cart-sidebar__head">
                    <span className="superscript">My Bag</span>
                    <button className="shop-cart-sidebar__close" onClick={onClose} aria-label="Close cart">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {items.length === 0 ? (
                    <div className="shop-cart-sidebar__empty">
                        <p>Your bag is empty.</p>
                        <button className="btn" style={{ marginTop: "1.5rem" }} onClick={onClose}>
                            Continue Shopping
                        </button>
                    </div>
                ) : (
                    <>
                        <ul className="shop-cart-sidebar__list">
                            {items.map((item) => (
                                <li key={item.slug} className="shop-cart-item">
                                    <div
                                        className="shop-cart-item__swatch"
                                        style={{ background: item.accentBg }}
                                    />
                                    <div className="shop-cart-item__info">
                                        <p className="shop-cart-item__name">{item.name}</p>
                                        <p className="shop-cart-item__price">{item.price}</p>
                                        <div className="shop-cart-item__qty">
                                            <button onClick={() => onQty(item.slug, -1)} aria-label="Decrease">−</button>
                                            <span>{item.qty}</span>
                                            <button onClick={() => onQty(item.slug, 1)} aria-label="Increase">+</button>
                                        </div>
                                    </div>
                                    <button
                                        className="shop-cart-item__remove"
                                        onClick={() => onRemove(item.slug)}
                                        aria-label="Remove item"
                                    >
                                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="shop-cart-sidebar__foot">
                            <div className="shop-cart-sidebar__total">
                                <span className="superscript">Total</span>
                                <span>
                                    {currency}
                                    {total.toFixed(2)}
                                </span>
                            </div>
                            <button className="btn shop-cart-sidebar__checkout">Proceed to Checkout</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Shop Product Card ──────────────────────────────────────────── */
const CATEGORIES = ["All", "UV Protection", "Targeted Treatment", "Brightening Moisturiser", "Eye Treatment", "Hydration Serum", "Overnight Treatment"];

function ShopCard({
    product,
    onAddToCart,
}: {
    product: (typeof products)[0];
    onAddToCart: (product: (typeof products)[0]) => void;
}) {
    const [added, setAdded] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleAdd = (e: React.MouseEvent) => {
        e.preventDefault();
        onAddToCart(product);
        setAdded(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setAdded(false), 1800);
    };

    return (
        <article
            className="shop-product-card reveal-up"
            data-reveal
            style={{ "--card-accent": product.accentBg } as React.CSSProperties}
        >
            <Link href={`/products/${product.slug}`} className="shop-product-card__inner">
                {/* Image area */}
                <div className="shop-product-card__image-wrap">
                    <div className="shop-product-card__image-overlay" />
                    <img
                        src={product.images.hero}
                        alt={product.name}
                        className="shop-product-card__img"
                    />
                    {/* Category pill */}
                    <span className="shop-product-card__category pill-fill">{product.category}</span>
                </div>

                {/* Info */}
                <div className="shop-product-card__body">
                    <div className="shop-product-card__text">
                        <h3 className="shop-product-card__name">{product.shortName}</h3>
                        <p className="shop-product-card__tagline">{product.tagline}</p>
                    </div>
                    <p className="shop-product-card__price product-price">{product.price}</p>
                </div>
            </Link>

            {/* Add to bag CTA */}
            <button
                className={`shop-product-card__cta${added ? " added" : ""}`}
                onClick={handleAdd}
                aria-label={`Add ${product.shortName} to bag`}
            >
                {added ? (
                    <>
                        <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                            <path d="M1 5.5L5.5 10L13 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Added</span>
                    </>
                ) : (
                    <>
                        <QuickCartIcon />
                        <span>Add to Bag</span>
                    </>
                )}
            </button>
        </article>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function ProductsPage() {
    const [activeFilter, setActiveFilter] = useState("All");
    const [cartOpen, setCartOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);

    const filtered =
        activeFilter === "All"
            ? products
            : products.filter((p) => p.category === activeFilter);

    const addToCart = (product: (typeof products)[0]) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.slug === product.slug);
            if (existing) {
                return prev.map((i) =>
                    i.slug === product.slug ? { ...i, qty: i.qty + 1 } : i
                );
            }
            return [
                ...prev,
                {
                    slug: product.slug,
                    name: product.shortName,
                    price: product.price,
                    qty: 1,
                    accentBg: product.accentBg,
                },
            ];
        });
    };

    const removeFromCart = (slug: string) =>
        setCart((prev) => prev.filter((i) => i.slug !== slug));

    const updateQty = (slug: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((i) => (i.slug === slug ? { ...i, qty: i.qty + delta } : i))
                .filter((i) => i.qty > 0)
        );
    };

    const cartCount = cart.reduce((n, i) => n + i.qty, 0);

    return (
        <div className="shop-page">
            <MotionProvider />
            <Header />

            {cartOpen && (
                <CartSidebar
                    items={cart}
                    onClose={() => setCartOpen(false)}
                    onRemove={removeFromCart}
                    onQty={updateQty}
                />
            )}

            <main>
                {/* ── SHOP HERO ─────────────────────────────────────── */}
                <section id="shop-hero">
                    <div className="shop-hero__bg" />

                    <div className="shop-hero__portrait reveal-up" data-reveal>
                        <img src="/images/skincare-hero-portrait.png" alt="Skincare Portrait" />
                    </div>

                    <div className="container shop-hero__content">
                        <span className="superscript shop-hero__label reveal-up" data-reveal>
                            The Collection
                        </span>
                        <h1 className="shop-hero__title reveal-up" data-reveal>
                            Precision
                            <br />
                            <span className="font-serif">formulated.</span>
                        </h1>
                        <p className="shop-hero__desc reveal-up" data-reveal>
                            Science-backed skincare. Every ingredient earns its place.
                        </p>
                    </div>

                    {/* Floating cart button */}
                    <button
                        className="shop-hero__cart-btn"
                        onClick={() => setCartOpen(true)}
                        aria-label="Open cart"
                    >
                        <CartIcon />
                        {cartCount > 0 && (
                            <span className="shop-hero__cart-count">{cartCount}</span>
                        )}
                    </button>
                </section>

                {/* ── SHOP STOREFRONT (SIDEBAR + GRID) ────────────────── */}
                <section id="shop-main">
                    <div className="container shop-layout">
                        <aside className="shop-sidebar reveal-up" data-reveal>
                            <h3 className="shop-sidebar__title">
                                <FilterIcon /> Categories
                            </h3>
                            <ul className="shop-sidebar__list" role="group" aria-label="Filter products">
                                {CATEGORIES.map((cat) => (
                                    <li key={cat}>
                                        <button
                                            className={`shop-sidebar__link${activeFilter === cat ? " active" : ""}`}
                                            onClick={() => setActiveFilter(cat)}
                                        >
                                            {cat}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <div className="shop-sidebar__count">
                                Showing {filtered.length} {filtered.length === 1 ? "product" : "products"}
                            </div>
                        </aside>

                        <div className="shop-grid-area">
                            {filtered.length > 0 ? (
                                <div className="shop-product-grid">
                                    {filtered.map((product) => (
                                        <ShopCard
                                            key={product.slug}
                                            product={product}
                                            onAddToCart={addToCart}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="shop-empty">
                                    <p>No products found in this category.</p>
                                    <button className="btn" onClick={() => setActiveFilter("All")}>
                                        View all products
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── ETHOS STRIP ──────────────────────────────────── */}
                <section id="shop-ethos" className="reveal-up" data-reveal>
                    <div className="container">
                        <div className="shop-ethos__inner">
                            {[
                                { icon: "/images/icon-clean-beyond-reproach.svg", label: "Clean Beyond Reproach" },
                                { icon: "/images/icon-radical-transparency.svg", label: "Radical Transparency" },
                                { icon: "/images/icon-real-results.svg", label: "Real Results" },
                                { icon: "/images/icon-conscious-responsible.svg", label: "Consciously Responsible" },
                            ].map((item) => (
                                <div key={item.label} className="shop-ethos__item">
                                    <div className="shop-ethos__icon">
                                        <img src={item.icon} alt={item.label} />
                                    </div>
                                    <p className="shop-ethos__label superscript">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
