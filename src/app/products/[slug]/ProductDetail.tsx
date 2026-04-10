"use client";

import Link from "next/link";
import { useParallax } from "@/hooks/useParallax";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import { getMe, getWholesalePrices } from "@/lib/auth/client";
import { addCartItem, addVariableCartItem, fetchVariableConfig, lookupVariationPrice } from "@/lib/storefront/client";
import type {
  StorefrontDetailProduct,
  StorefrontVariableConfig,
  StorefrontVariationAttribute,
} from "@/lib/storefront/types";
import { useEffect, useMemo, useState } from "react";

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

function normalizeVariationComparable(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeVariationKey(value: string): string {
  return normalizeVariationComparable(value)
    .replace(/^attribute_/, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toVariationValueToken(value: string): string {
  return normalizeVariationComparable(value)
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function variationValuesMatch(leftRaw: string, rightRaw: string): boolean {
  const left = normalizeVariationComparable(leftRaw);
  const right = normalizeVariationComparable(rightRaw);
  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  return toVariationValueToken(left) === toVariationValueToken(right);
}

function variationKeyCandidates(value: string): string[] {
  const normalized = normalizeVariationKey(value);
  if (!normalized) {
    return [];
  }

  if (normalized.startsWith("pa_")) {
    return [normalized, normalized.slice(3)];
  }

  return [normalized, `pa_${normalized}`];
}

function resolveVariationEntryValue(
  entryAttributes: Record<string, string>,
  attribute: StorefrontVariationAttribute,
): string | null {
  const wanted = new Set<string>([
    ...variationKeyCandidates(attribute.id),
    ...variationKeyCandidates(attribute.apiName),
    ...variationKeyCandidates(attribute.label),
  ]);

  for (const [rawKey, rawValue] of Object.entries(entryAttributes)) {
    if (!rawValue) {
      continue;
    }

    const possibleKeys = variationKeyCandidates(rawKey);
    if (possibleKeys.some((key) => wanted.has(key))) {
      return rawValue;
    }
  }

  return null;
}

export default function ProductDetail({ product }: { product: StorefrontDetailProduct }) {
  const heroImgRef = useParallax<HTMLImageElement>(0.12);
  const detailImgRef = useParallax<HTMLImageElement>(0.15);
  const textureRef = useParallax<HTMLImageElement>(0.18);
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [displayPrice, setDisplayPrice] = useState(product.price);
  const [displayRegularPrice, setDisplayRegularPrice] = useState<string | null>(product.regularPrice ?? null);
  const [isWholesalePrice, setIsWholesalePrice] = useState(false);
  const [variationConfig, setVariationConfig] = useState<StorefrontVariableConfig | null>(
    product.variableConfig ?? null,
  );
  const [variationSelection, setVariationSelection] = useState<Record<string, string>>(
    product.variableConfig?.defaults ?? {},
  );
  const [variationLoading, setVariationLoading] = useState(false);
  const [variationError, setVariationError] = useState<string | null>(null);
  const isVariableProduct = product.hasOptions === true || product.productType === "variable";
  const isOutOfStock = product.inStock === false || product.stockStatus === "outofstock";
  const stockMessage = product.stockMessage || "This product is currently out of stock and unavailable.";

  useEffect(() => {
    let active = true;

    async function applyRoleAwarePrice(): Promise<void> {
      const retail = product.price;

      try {
        const me = await getMe();
        const wholesale =
          me.user.role === "wholesale_customer" &&
          me.user.clinicStatus === "approved" &&
          Boolean(me.user.wholesaleApproved);

        if (!active) {
          return;
        }

        if (!wholesale || !product.wooId || product.wooId <= 0) {
          setDisplayPrice(retail);
          setDisplayRegularPrice(product.regularPrice ?? null);
          setIsWholesalePrice(false);
          return;
        }

        const prices = await getWholesalePrices([product.wooId]);
        if (!active) {
          return;
        }

        const entry = prices.prices[String(product.wooId)];
        if (!entry || entry.source !== "wholesale" || !prices.isWholesaleViewer) {
          setDisplayPrice(retail);
          setDisplayRegularPrice(product.regularPrice ?? null);
          setIsWholesalePrice(false);
          return;
        }

        setDisplayPrice(entry.priceLabel || retail);
        setDisplayRegularPrice(entry.hasDiscount ? entry.regularPriceLabel : null);
        setIsWholesalePrice(true);
      } catch {
        if (!active) {
          return;
        }

        setDisplayPrice(retail);
        setDisplayRegularPrice(product.regularPrice ?? null);
        setIsWholesalePrice(false);
      }
    }

    void applyRoleAwarePrice();

    return () => {
      active = false;
    };
  }, [product.price, product.regularPrice, product.wooId]);

  useEffect(() => {
    let active = true;

    async function loadVariationConfig(): Promise<void> {
      if (!isVariableProduct || !product.wooId || product.wooId <= 0) {
        setVariationConfig(null);
        setVariationSelection({});
        setVariationError(null);
        return;
      }

      if (
        product.variableConfig?.isVariable &&
        product.variableConfig.attributes.length > 0 &&
        product.variableConfig.variations.length > 0
      ) {
        setVariationConfig(product.variableConfig);
        setVariationSelection(product.variableConfig.defaults ?? {});
        setVariationError(null);
        return;
      }

      setVariationLoading(true);
      setVariationError(null);

      try {
        const config = await fetchVariableConfig(product.wooId);
        if (!active) {
          return;
        }

        if (!config.isVariable || config.attributes.length === 0) {
          setVariationConfig(config);
          setVariationSelection({});
          setVariationError("Product options are unavailable right now. Please try again in a moment.");
          return;
        }

        setVariationConfig(config);
        setVariationSelection(config.defaults);
      } catch {
        if (!active) {
          return;
        }

        setVariationConfig(null);
        setVariationSelection({});
        setVariationError("Unable to load product options. Please refresh and try again.");
      } finally {
        if (active) {
          setVariationLoading(false);
        }
      }
    }

    void loadVariationConfig();

    return () => {
      active = false;
    };
  }, [isVariableProduct, product.wooId, product.variableConfig]);

  const variationAttributes = variationConfig?.attributes ?? [];
  const variationEntries = variationConfig?.variations ?? [];
  const optionsReady = !isVariableProduct || variationAttributes.length > 0;
  const missingSelections = variationAttributes.filter((attribute) => !variationSelection[attribute.id]);

  // Fetch the variation price on-demand whenever the selection changes.
  // This uses the wc-ajax=get_variation endpoint — WooCommerce's own mechanism —
  // which is reliable regardless of how the Store API exposes variation data.
  useEffect(() => {
    if (!isVariableProduct || !product.wooId || isWholesalePrice) {
      return;
    }
    if (variationAttributes.length === 0 || missingSelections.length > 0) {
      return;
    }

    let active = true;

    async function fetchPriceForSelection(): Promise<void> {
      try {
        const result = await lookupVariationPrice(
          product.wooId!,
          variationAttributes.map((attribute) => ({
            apiName: attribute.apiName,
            value: variationSelection[attribute.id] ?? "",
          })),
        );
        if (!active || !result) {
          return;
        }
        setDisplayPrice(result.price);
        setDisplayRegularPrice(result.regularPrice);
      } catch {
        // Keep existing price on error — don't break the page
      }
    }

    void fetchPriceForSelection();

    return () => {
      active = false;
    };
  }, [variationSelection, isVariableProduct, product.wooId, isWholesalePrice, variationAttributes, missingSelections.length]);


  const selectedVariation = useMemo(() => {
    if (!isVariableProduct || variationAttributes.length === 0 || variationEntries.length === 0) {
      return null;
    }

    if (missingSelections.length > 0) {
      return null;
    }

    return (
      variationEntries.find((entry) =>
        variationAttributes.every((attribute) => {
          const selectedValue = variationSelection[attribute.id];
          const entryValue = resolveVariationEntryValue(entry.attributes, attribute);
          if (!selectedValue || !entryValue) {
            return false;
          }

          return variationValuesMatch(selectedValue, entryValue);
        }),
      ) ?? null
    );
  }, [isVariableProduct, missingSelections.length, variationAttributes, variationEntries, variationSelection]);
  const selectedVariationOutOfStock =
    selectedVariation !== null &&
    (selectedVariation.inStock === false || selectedVariation.stockStatus === "outofstock");
  const canAddWithSelection =
    !isVariableProduct ||
    (optionsReady && missingSelections.length === 0 && !selectedVariationOutOfStock);
  const effectivePrice =
    !isWholesalePrice && selectedVariation?.price ? selectedVariation.price : displayPrice;
  const effectiveRegularPrice =
    !isWholesalePrice && selectedVariation
      ? selectedVariation.regularPrice ?? null
      : displayRegularPrice;

  const handleAddToBag = async () => {
    if (!product.wooId || adding || isOutOfStock || variationLoading) {
      return;
    }

    if (isVariableProduct) {
      if (!optionsReady) {
        setAddStatus({
          tone: "error",
          message: variationError || "Product options are not ready yet. Please try again.",
        });
        return;
      }

      if (missingSelections.length > 0) {
        setAddStatus({
          tone: "error",
          message: "Please select all required options before adding to bag.",
        });
        return;
      }
    }

    setAdding(true);
    setAddStatus(null);

    try {
      if (isVariableProduct) {
        await addVariableCartItem(
          product.wooId,
          variationAttributes.map((attribute) => ({
            attribute: attribute.apiName,
            value: variationSelection[attribute.id],
          })),
          1,
        );
      } else {
        await addCartItem(product.wooId, 1);
      }
      setAddStatus({ tone: "success", message: "Added to bag" });
    } catch (error) {
      setAddStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to add this item to your bag.",
      });
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
            <p className="product-intro__price" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              {effectiveRegularPrice && effectiveRegularPrice !== effectivePrice ? (
                <span style={{ opacity: 0.6, textDecoration: "line-through", fontSize: "0.8em" }}>{effectiveRegularPrice}</span>
              ) : null}
              <span>{effectivePrice}</span>
              {isWholesalePrice ? (
                <span style={{ fontSize: "0.6em", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-gray2)" }}>
                  Wholesale
                </span>
              ) : null}
            </p>
            {isVariableProduct ? (
              <div className="product-intro__variation-picker">
                {variationAttributes.map((attribute) => (
                  <label key={attribute.id} className="product-intro__variation-field">
                    <span>{attribute.label}</span>
                    <select
                      value={variationSelection[attribute.id] ?? ""}
                      onChange={(event) =>
                        setVariationSelection((previous) => ({
                          ...previous,
                          [attribute.id]: event.target.value,
                        }))
                      }
                      disabled={variationLoading || isOutOfStock}
                    >
                      <option value="">Select {attribute.label}</option>
                      {attribute.options.map((option) => (
                        <option key={`${attribute.id}:${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="btn product-intro__cta"
              onClick={handleAddToBag}
              disabled={
                !product.wooId ||
                adding ||
                isOutOfStock ||
                variationLoading ||
                !canAddWithSelection
              }
            >
              {isOutOfStock
                ? "Out of Stock"
                : selectedVariationOutOfStock
                  ? "Out of Stock"
                : variationLoading
                  ? "Loading options..."
                  : !canAddWithSelection
                    ? "Select Options"
                    : adding
                      ? "Adding..."
                      : "Add to Bag"}
            </button>
            {variationError ? (
              <p className="product-intro__status product-intro__status--error" role="status" aria-live="polite">
                {variationError}
              </p>
            ) : null}
            {isOutOfStock ? (
              <p className="product-intro__stock-note" role="status" aria-live="polite">
                {stockMessage}
              </p>
            ) : selectedVariationOutOfStock ? (
              <p className="product-intro__stock-note" role="status" aria-live="polite">
                This variation is out of stock.
              </p>
            ) : null}
            {addStatus ? (
              <p
                className={`product-intro__status product-intro__status--${addStatus.tone}`}
                role="status"
                aria-live="polite"
              >
                {addStatus.message}
              </p>
            ) : null}
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
