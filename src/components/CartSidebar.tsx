"use client";

import Image from "next/image";
import Link from "next/link";
import type { StorefrontCart } from "@/types";

export default function CartSidebar({
  cart,
  onClose,
  onRemove,
  onQty,
  busy,
}: {
  cart: StorefrontCart;
  onClose: () => void;
  onRemove: (key: string) => Promise<void>;
  onQty: (key: string, nextQty: number) => Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="shop-cart-overlay" onClick={onClose}>
      <div className="shop-cart-sidebar" onClick={(event) => event.stopPropagation()}>
        <div className="shop-cart-sidebar__head">
          <span className="superscript">My Bag</span>
          <button className="shop-cart-sidebar__close" onClick={onClose} aria-label="Close cart">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {cart.items.length === 0 ? (
          <div className="shop-cart-sidebar__empty">
            <p>Your bag is empty.</p>
            <button className="btn" style={{ marginTop: "1.5rem" }} onClick={onClose}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="shop-cart-sidebar__list">
              {cart.items.map((item) => (
                <li key={item.key} className="shop-cart-item">
                  <div className="shop-cart-item__swatch" style={{ background: item.accentBg }}>
                    <Image src={item.image} alt={item.imageAlt} fill sizes="3.5rem" style={{ objectFit: "cover" }} />
                  </div>
                  <div className="shop-cart-item__info">
                    <p className="shop-cart-item__name">{item.name}</p>
                    <p className="shop-cart-item__price">{item.price}</p>
                    {item.variations.length > 0 ? (
                      <ul className="shop-cart-item__variations" aria-label="Selected options">
                        {item.variations.map((variation) => (
                          <li key={`${item.key}:${variation.label}:${variation.value}`}>
                            <span>{variation.label}:</span> {variation.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="shop-cart-item__qty">
                      <button
                        onClick={() =>
                          item.quantity <= 1 ? void onRemove(item.key) : void onQty(item.key, item.quantity - 1)
                        }
                        aria-label="Decrease"
                        disabled={busy}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => onQty(item.key, item.quantity + 1)}
                        aria-label="Increase"
                        disabled={busy}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    className="shop-cart-item__remove"
                    onClick={() => onRemove(item.key)}
                    aria-label="Remove item"
                    disabled={busy}
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
                <span>{cart.total}</span>
              </div>
              <Link href="/cart" className="btn shop-cart-sidebar__checkout" onClick={onClose}>
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
