"use client";

import Link from "next/link";
import { useParallax } from "@/hooks/useParallax";
import type { Product } from "@/data/products";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import { useState } from "react";

function ArrowLongIcon() {
  return (
    <svg className="icon-arrowlong" width="19" height="19" viewBox="0 0 19 19" fill="none">
      <path
        d="M18.7425 0.726739C18.7425 0.467333 18.5322 0.257042 18.2728 0.257042L14.0455 0.257042C13.7861 0.257042 13.5758 0.467333 13.5758 0.72674C13.5758 0.986147 13.7861 1.19644 14.0455 1.19644L17.8031 1.19644L17.8031 4.95401C17.8031 5.21342 18.0134 5.42371 18.2728 5.42371C18.5322 5.42371 18.7425 5.21342 18.7425 4.95401L18.7425 0.726739ZM0.786716 18.877L18.6049 1.05887L17.9406 0.394614L0.122464 18.2128L0.786716 18.877Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ProductDetail({ product }: { product: Product }) {
  const heroImgRef = useParallax<HTMLImageElement>(0.12);
  const detailImgRef = useParallax<HTMLImageElement>(0.15);
  const textureRef = useParallax<HTMLImageElement>(0.18);
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<string | null>(null);

  const handleAddToBag = async () => {
    if (!product.wooId || adding) {
      return;
    }

    setAdding(true);
    setAddStatus(null);

    try {
      const response = await fetch("/api/woo/cart/add-item", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: product.wooId,
          quantity: 1,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to add this item to your bag.");
      }

      setAddStatus("Added to bag");
    } catch (error) {
      setAddStatus(error instanceof Error ? error.message : "Unable to add this item to your bag.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="product-page">
      <MotionProvider />
      <Header />

      <main>
        {/* ── 1. HERO ─────────────────────────────────────────────── */}
        <section id="product-intro">
          <div className="product-intro__content reveal-up" data-reveal>
            <Link href="/products" className="product-intro__back">
              <ArrowLongIcon />
              <span>All Products</span>
            </Link>
            <span className="pill product-intro__pill">{product.category}</span>
            <h1 className="product-intro__title">
              {product.shortName.split(" ").slice(0, -1).join(" ")}{" "}
              <br />
              <span className="font-serif">
                {product.shortName.split(" ").slice(-1)[0]}
              </span>
            </h1>
            <p className="product-intro__tagline">{product.tagline}</p>
            <p className="product-intro__price">{product.price}</p>
            <button
              type="button"
              className="btn product-intro__cta"
              onClick={handleAddToBag}
              disabled={!product.wooId || adding}
            >
              {adding ? "Adding..." : "Add to Bag"}
            </button>
            {addStatus ? <p style={{ marginTop: "1rem", fontSize: "0.85rem" }}>{addStatus}</p> : null}
          </div>

          <div className="product-intro__image">
            <div className="product-intro__image-overlay" />
            <div className="product-intro__parallax">
              <img
                ref={heroImgRef}
                src={product.images.hero}
                alt={product.images.heroAlt}
                className="parallax-image-asset"
              />
            </div>
          </div>
        </section>

        {/* ── 2. CLAIM (Ethos-style) ───────────────────────────────── */}
        <section id="product-claim" className="reveal-up" data-reveal>
          <div className="container">
            <div className="product-claim__text">
              <h2 className="product-claim__headline">
                {product.claim.headline} <br />
                <span className="font-serif text-uppercase">
                  {product.claim.headlineSerif}
                </span>
              </h2>
              <h2 className="product-claim__sub">{product.claim.sub}</h2>
            </div>

            <div className="product-claim__image parallax-scroll">
              <img
                ref={textureRef}
                src={product.images.texture}
                alt={product.name}
                className="parallax-image-asset"
              />
            </div>

            <div className="product-claim__desc">
              <p>{product.description}</p>
            </div>
          </div>
        </section>

        {/* ── 3. BENEFITS (half__grid-style) ──────────────────────── */}
        <section id="product-benefits">
          <div className="half__grid reveal-up" data-reveal>
            <div className="half__grid-img">
              <img
                ref={detailImgRef}
                src={product.images.detail}
                alt={product.images.detailAlt}
                className="parallax-image-asset"
              />
            </div>

            <div className="half__grid-content product-benefits__content">
              <div className="product-benefits__head">
                <h2 className="product-benefits__title">
                  What it <br />
                  <span className="font-serif">does.</span>
                </h2>
              </div>

              <div className="product-benefits__grid">
                {product.benefits.map((b, i) => (
                  <div
                    key={b.title}
                    className="product-benefit__item reveal-up"
                    data-reveal
                    style={{ "--stagger-delay": `${i * 0.08}s` } as React.CSSProperties}
                  >
                    <div className="product-benefit__icon">
                      <img alt={b.title} src={b.icon} />
                    </div>
                    <h3 className="product-benefit__title">{b.title}</h3>
                    <p className="product-benefit__desc">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. KEY INGREDIENTS ──────────────────────────────────── */}
        <section id="product-ingredients-list" className="reveal-up" data-reveal>
          <div className="container">
            <div className="product-ing__head">
              <span className="superscript product-ing__label">Formula</span>
              <h2 className="product-ing__title">
                Key <span className="font-serif">Ingredients</span>
              </h2>
            </div>

            <div className="product-ing__grid">
              {product.keyIngredients.map((ing, i) => (
                <div key={ing.name} className="product-ing__item">
                  <span className="product-ing__number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="product-ing__divider" />
                  <h3 className="product-ing__name">{ing.name}</h3>
                  <p className="product-ing__desc">{ing.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. HOW TO USE ────────────────────────────────────────── */}
        <section id="product-usage" className="reveal-up" data-reveal>
          <div className="container">
            <div className="product-usage__inner">
              <div className="product-usage__head">
                <span className="superscript product-usage__label">Routine</span>
                <h2 className="product-usage__title">
                  How to <span className="font-serif">Use</span>
                </h2>
              </div>
              <ol className="product-usage__steps">
                {product.howToUse.map((step, i) => (
                  <li key={i} className="product-usage__step">
                    <span className="product-usage__step-num">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ── 6. BACK LINK ─────────────────────────────────────────── */}
        <section id="product-back" className="reveal-up" data-reveal>
          <div className="container text-center">
            <Link href="/products" className="product-back__link">
              <div className="arrowlong">
                <ArrowLongIcon />
              </div>
              <p>Explore all products</p>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
