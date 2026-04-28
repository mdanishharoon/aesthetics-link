"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import CartSidebar from "@/components/CartSidebar";
import { getWholesalePrices } from "@/lib/auth/client";
import { useAuth } from "@/components/AuthProvider";
import { decodeEntities } from "@/lib/utils/text";
import { trackMarketingEvent } from "@/lib/marketing/client";
import { resolveMarketingCustomerType, resolveMarketingRegion } from "@/lib/marketing/context";
import {
  addCartItem,
  addVariableCartItem,
  fetchProductReviews,
  fetchCart,
  removeCartItem,
  submitProductReview,
  updateCartItemQuantity,
} from "@/lib/storefront/client";
import type {
  StorefrontCart,
  StorefrontCatalogProduct,
  StorefrontDetailProduct,
  StorefrontProductReview,
  StorefrontProductReviewsSummary,
  StorefrontVariationAttribute,
} from "@/lib/storefront/types";
import { useEffect, useMemo, useRef, useState } from "react";

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

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const pct = Math.round((rating / 5) * 100);
  return (
    <span className={`stars stars--${size}`} aria-label={`${rating} out of 5 stars`}>
      <span className="stars__fill" style={{ width: `${pct}%` }}>★★★★★</span>
      <span className="stars__empty" aria-hidden>★★★★★</span>
    </span>
  );
}

type ProductGalleryImage = {
  src: string;
  alt: string;
  label: string;
};

function ProductGallery({
  images,
  activeIndex,
  onChange,
}: {
  images: ProductGalleryImage[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  const activeImage = images[activeIndex] ?? images[0];

  if (!activeImage) {
    return null;
  }

  const goTo = (direction: -1 | 1) => {
    const nextIndex = (activeIndex + direction + images.length) % images.length;
    onChange(nextIndex);
  };

  return (
    <div className="product-gallery" aria-label="Product images">
      <div className="product-gallery__stage">
        <Image
          src={activeImage.src}
          alt={activeImage.alt}
          fill
          priority={activeIndex === 0}
          sizes="55vw"
          style={{ objectFit: "cover" }}
        />
        {images.length > 1 ? (
          <div className="product-gallery__controls">
            <button type="button" onClick={() => goTo(-1)} aria-label="Previous product image">
              <ArrowLongIcon />
            </button>
            <span>
              {String(activeIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
            </span>
            <button type="button" onClick={() => goTo(1)} aria-label="Next product image">
              <ArrowLongIcon />
            </button>
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="product-gallery__thumbs" aria-label="Choose product image">
          {images.map((image, index) => (
            <button
              type="button"
              key={`${image.src}:${image.label}`}
              className={`product-gallery__thumb${index === activeIndex ? " is-active" : ""}`}
              onClick={() => onChange(index)}
              aria-label={`Show ${image.label.toLowerCase()} image`}
              aria-pressed={index === activeIndex}
            >
              <Image src={image.src} alt="" fill sizes="6rem" style={{ objectFit: "cover" }} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
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

function normalizePriceLabel(value: string | null | undefined): string {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  let normalized = decodeEntities(value).replace(/\s+/g, " ").trim();
  normalized = normalized.replace(/^price range:\s*/i, "");
  normalized = normalized.replace(/\s+through\s+/i, " - ");
  return normalized.trim();
}

export default function ProductDetail({ product, related = [] }: { product: StorefrontDetailProduct; related?: StorefrontCatalogProduct[] }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [addStatus, setAddStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    body: "",
    author: "",
    email: "",
  });
  const [reviewFeedback, setReviewFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const reviewSubmitInFlightRef = useRef<Promise<void> | null>(null);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [reviewsModalTab, setReviewsModalTab] = useState<"read" | "write">("read");
  const [galleryIndex, setGalleryIndex] = useState(0);

  function openReviewsModal(tab: "read" | "write") {
    setReviewsModalTab(tab);
    setReviewsModalOpen(true);
  }
  const variationConfig = product.variableConfig ?? null;
  const [variationSelection, setVariationSelection] = useState<Record<string, string>>(
    product.variableConfig?.defaults ?? {},
  );

  const { data: cart = EMPTY_CART } = useQuery<StorefrontCart>({
    queryKey: ["storefront", "cart"],
    queryFn: fetchCart,
    enabled: false,
  });

  const reviewsQuery = useQuery({
    queryKey: ["storefront", "product-reviews", product.wooId ?? 0],
    queryFn: () => fetchProductReviews(product.wooId ?? 0),
    enabled: Number.isInteger(product.wooId) && (product.wooId ?? 0) > 0,
  });

  const removeCartMutation = useMutation({
    mutationFn: (key: string) => removeCartItem(key),
    onMutate: async (key) => {
      await queryClient.cancelQueries({ queryKey: ["storefront", "cart"] });
      const snapshot = queryClient.getQueryData<StorefrontCart>(["storefront", "cart"]);
      if (snapshot) {
        const removed = snapshot.items.find((item) => item.key === key);
        queryClient.setQueryData<StorefrontCart>(["storefront", "cart"], {
          ...snapshot,
          items: snapshot.items.filter((item) => item.key !== key),
          itemCount: snapshot.itemCount - (removed?.quantity ?? 1),
        });
      }
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(["storefront", "cart"], context.snapshot);
      }
    },
    onSuccess: (nextCart) => {
      queryClient.setQueryData(["storefront", "cart"], nextCart);
    },
  });

  const updateCartMutation = useMutation({
    mutationFn: ({ key, quantity }: { key: string; quantity: number }) =>
      updateCartItemQuantity(key, quantity),
    onMutate: async ({ key, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ["storefront", "cart"] });
      const snapshot = queryClient.getQueryData<StorefrontCart>(["storefront", "cart"]);
      if (snapshot) {
        queryClient.setQueryData<StorefrontCart>(["storefront", "cart"], {
          ...snapshot,
          items: snapshot.items.map((item) => (item.key === key ? { ...item, quantity } : item)),
          itemCount: snapshot.items.reduce(
            (sum, item) => sum + (item.key === key ? quantity : item.quantity),
            0,
          ),
        });
      }
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(["storefront", "cart"], context.snapshot);
      }
    },
    onSuccess: (nextCart) => {
      queryClient.setQueryData(["storefront", "cart"], nextCart);
    },
  });

  const cartBusy = removeCartMutation.isPending || updateCartMutation.isPending;
  const isVariableProduct = product.hasOptions === true || product.productType === "variable";
  const isOutOfStock = product.inStock === false || product.stockStatus === "outofstock";
  const stockMessage = product.stockMessage || "This product is currently out of stock and unavailable.";

  const { user } = useAuth();
  const trackedViewRef = useRef(false);

  const marketingContext = useMemo(
    () => ({
      customerType: resolveMarketingCustomerType(user),
      region: resolveMarketingRegion(
        user,
        typeof navigator !== "undefined" ? navigator.language : "",
      ),
      email: user?.email ?? "",
    }),
    [user],
  );

  const isWholesaleViewer = Boolean(
    user &&
      user.role === "wholesale_customer" &&
      user.clinicStatus === "approved" &&
      user.wholesaleApproved,
  );

  const variationAttributes = useMemo(() => variationConfig?.attributes ?? [], [variationConfig]);
  const variationEntries = useMemo(() => variationConfig?.variations ?? [], [variationConfig]);
  const wholesalePriceIds = useMemo(() => {
    const ids = new Set<number>();

    if (Number.isInteger(product.wooId) && (product.wooId as number) > 0) {
      ids.add(product.wooId as number);
    }

    for (const entry of variationEntries) {
      if (Number.isInteger(entry.id) && (entry.id as number) > 0) {
        ids.add(entry.id as number);
      }
    }

    return Array.from(ids).slice(0, 100);
  }, [product.wooId, variationEntries]);
  const wholesalePricesQuery = useQuery({
    queryKey: ["auth", "wholesale-prices", wholesalePriceIds.join(",")],
    queryFn: () => getWholesalePrices(wholesalePriceIds),
    enabled: isWholesaleViewer && wholesalePriceIds.length > 0,
  });

  const wholesalePriceEntry = wholesalePricesQuery.data?.prices[String(product.wooId)];
  const isWholesalePrice = Boolean(
    isWholesaleViewer &&
      wholesalePricesQuery.data?.isWholesaleViewer &&
      wholesalePriceEntry &&
      wholesalePriceEntry.source === "wholesale",
  );
  const optionsReady = !isVariableProduct || variationAttributes.length > 0;
  const missingSelections = variationAttributes.filter((attribute) => !variationSelection[attribute.id]);



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
  const selectedVariationWholesaleEntry =
    selectedVariation && Number.isInteger(selectedVariation.id) && (selectedVariation.id as number) > 0
      ? wholesalePricesQuery.data?.prices[String(selectedVariation.id)]
      : null;
  const wholesaleBasePrice = normalizePriceLabel(wholesalePriceEntry?.priceLabel) || product.price;
  const wholesaleBaseRegularPrice = wholesalePriceEntry?.hasDiscount
    ? normalizePriceLabel(wholesalePriceEntry.regularPriceLabel)
    : null;
  const wholesaleVariationPrice =
    selectedVariationWholesaleEntry && selectedVariationWholesaleEntry.source === "wholesale"
      ? normalizePriceLabel(selectedVariationWholesaleEntry.priceLabel)
      : null;
  const wholesaleVariationRegularPrice =
    selectedVariationWholesaleEntry &&
    selectedVariationWholesaleEntry.source === "wholesale" &&
    selectedVariationWholesaleEntry.hasDiscount
      ? normalizePriceLabel(selectedVariationWholesaleEntry.regularPriceLabel)
      : null;
  const displayPrice = isWholesalePrice
    ? wholesaleVariationPrice ?? selectedVariation?.price ?? wholesaleBasePrice
    : product.price;
  const displayRegularPrice = isWholesalePrice
    ? wholesaleVariationRegularPrice ?? selectedVariation?.regularPrice ?? wholesaleBaseRegularPrice
    : product.regularPrice ?? null;

  const effectivePrice = !isWholesalePrice && selectedVariation?.price ? selectedVariation.price : displayPrice;
  const effectiveRegularPrice = !isWholesalePrice && selectedVariation
    ? selectedVariation.regularPrice ?? null
    : displayRegularPrice;

  const reviewSummary = useMemo<StorefrontProductReviewsSummary | null>(() => {
    return reviewsQuery.data?.summary ?? null;
  }, [reviewsQuery.data?.summary]);

  const reviewItems = useMemo<StorefrontProductReview[]>(() => {
    return reviewsQuery.data?.reviews ?? [];
  }, [reviewsQuery.data?.reviews]);
  const titleWords = product.shortName.trim().split(/\s+/).filter(Boolean);
  const titleLead = titleWords.length > 1 ? titleWords.slice(0, -1).join(" ") : product.shortName;
  const titleAccent = titleWords.length > 1 ? titleWords[titleWords.length - 1] ?? null : null;
  const galleryImages = useMemo<ProductGalleryImage[]>(() => {
    const candidates: ProductGalleryImage[] = [
      { src: product.images.hero, alt: product.images.heroAlt, label: "Main" },
      { src: product.images.detail, alt: product.images.detailAlt, label: "Detail" },
      { src: product.images.texture, alt: `${product.name} texture`, label: "Texture" },
    ];
    const seen = new Set<string>();
    return candidates.filter((image) => {
      if (!image.src || seen.has(image.src)) {
        return false;
      }
      seen.add(image.src);
      return true;
    });
  }, [product.images.detail, product.images.detailAlt, product.images.hero, product.images.heroAlt, product.images.texture, product.name]);

  useEffect(() => {
    if (trackedViewRef.current) {
      return;
    }

    trackedViewRef.current = true;
    void trackMarketingEvent({
      event: "viewed_product",
      email: marketingContext.email,
      source: "product_detail",
      customerType: marketingContext.customerType,
      region: marketingContext.region,
      payload: {
        productId: product.wooId,
        productSlug: product.slug,
        productName: product.name,
        productType: product.productType ?? "simple",
      },
    });
  }, [marketingContext, product.name, product.productType, product.slug, product.wooId]);

  const handleAddToBag = async () => {
    if (!product.wooId || adding || isOutOfStock) {
      return;
    }

    if (isVariableProduct) {
      if (!optionsReady) {
        setAddStatus({
          tone: "error",
          message: "Product options are unavailable. Please refresh and try again.",
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
      // Refresh cart cache so Header count updates and sidebar shows current state
      const freshCart = await fetchCart();
      queryClient.setQueryData(["storefront", "cart"], freshCart);
      void trackMarketingEvent({
        event: "added_to_cart",
        email: marketingContext.email,
        source: "product_detail",
        customerType: marketingContext.customerType,
        region: marketingContext.region,
        payload: {
          productId: product.wooId,
          productSlug: product.slug,
          productName: product.name,
          isVariable: isVariableProduct,
          variationId: selectedVariation?.id ?? 0,
        },
      });
      setAddStatus({ tone: "success", message: "Added to bag" });
      setCartOpen(true);
    } catch (error) {
      setAddStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to add this item to your bag.",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromCart = async (key: string): Promise<void> => {
    await removeCartMutation.mutateAsync(key);
  };

  const handleUpdateQty = async (key: string, nextQty: number): Promise<void> => {
    await updateCartMutation.mutateAsync({ key, quantity: nextQty });
  };

  const handleSubmitReview = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setReviewFeedback(null);
    if (reviewSubmitInFlightRef.current) {
      setReviewFeedback({
        tone: "error",
        message: "Your previous review is still processing. Please wait a moment.",
      });
      return;
    }
    if (!product.wooId || product.wooId <= 0) {
      setReviewFeedback({
        tone: "error",
        message: "Review submission is unavailable for this product.",
      });
      return;
    }

    setReviewSubmitting(true);
    setReviewFeedback({
      tone: "success",
      message: "Submitting your review...",
    });
    let allowAutoClose = true;
    const closeTimer = window.setTimeout(() => {
      if (allowAutoClose) {
        setReviewsModalTab("read");
        setReviewsModalOpen(false);
      }
    }, 700);

    const request = submitProductReview({
      productId: product.wooId ?? 0,
      rating: reviewForm.rating,
      title: reviewForm.title,
      body: reviewForm.body,
      author: user ? undefined : reviewForm.author,
      email: user ? undefined : reviewForm.email,
    })
      .then(() => {
        setReviewFeedback({
          tone: "success",
          message: "Thanks! Your review has been submitted.",
        });
        setReviewForm((prev) => ({
          ...prev,
          title: "",
          body: "",
        }));
        void reviewsQuery.refetch();
      })
      .catch((error) => {
        allowAutoClose = false;
        setReviewsModalTab("write");
        setReviewsModalOpen(true);
        setReviewFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "Unable to submit review.",
        });
      })
      .finally(() => {
        window.clearTimeout(closeTimer);
        reviewSubmitInFlightRef.current = null;
        setReviewSubmitting(false);
      });

    reviewSubmitInFlightRef.current = request;
  };

  return (
    <div className="product-page">
      <MotionProvider />
      <Header forceScrolled />

      {cartOpen && (
        <CartSidebar
          cart={cart}
          onClose={() => setCartOpen(false)}
          onRemove={handleRemoveFromCart}
          onQty={handleUpdateQty}
          busy={cartBusy}
        />
      )}

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
              {titleLead}
              {titleAccent ? (
                <>
                  {" "}
                  <br />
                  <span className="font-serif">{titleAccent}</span>
                </>
              ) : null}
            </h1>
            <p className="product-intro__tagline">{product.tagline}</p>
            {reviewSummary ? (
              <button type="button" className="product-rating-badge" onClick={() => openReviewsModal("read")}>
                <Stars rating={reviewSummary.average} />
                <span className="product-rating-badge__score">{reviewSummary.average.toFixed(1)}</span>
                <span className="product-rating-badge__count">({reviewSummary.count} reviews)</span>
              </button>
            ) : null}
            <p className="product-intro__price">
              {effectiveRegularPrice && effectiveRegularPrice !== effectivePrice ? (
                <span className="product-intro__price-was">{effectiveRegularPrice}</span>
              ) : null}
              <span>{effectivePrice}</span>
              {isWholesalePrice ? (
                <span className="product-intro__price-note">Wholesale</span>
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
                      disabled={isOutOfStock}
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
              disabled={!product.wooId || adding || isOutOfStock || !canAddWithSelection}
            >
              {isOutOfStock || selectedVariationOutOfStock
                ? "Out of Stock"
                : !canAddWithSelection
                  ? "Select Options"
                  : adding
                    ? "Adding..."
                    : "Add to Bag"}
            </button>
            {reviewFeedback ? (
              <p
                className={`product-intro__status product-intro__status--${reviewFeedback.tone}`}
                role="status"
                aria-live="polite"
              >
                {reviewFeedback.message}
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
            <ProductGallery images={galleryImages} activeIndex={galleryIndex} onChange={setGalleryIndex} />
          </div>
        </section>

        {/* ── 2. BENEFITS (half__grid-style) ──────────────────────── */}
        <section id="product-benefits">
          <div className="half__grid reveal-up" data-reveal>
            <div className="half__grid-img">
              <Image
                src={product.images.detail}
                alt={product.images.detailAlt}
                fill
                sizes="50vw"
                style={{ objectFit: "cover" }}
              />
            </div>

            <div className="half__grid-content product-benefits__content">
              <div className="product-benefits__head">
                <h2 className="product-benefits__title">
                  Visible <br />
                  <span className="font-serif">results.</span>
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
                      <Image src={b.icon} alt={b.title} width={32} height={32} unoptimized style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                    <h3 className="product-benefit__title">{b.title}</h3>
                    <p className="product-benefit__desc">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. KEY INGREDIENTS ──────────────────────────────────── */}
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

        {/* ── 4. HOW TO USE ────────────────────────────────────────── */}
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

        {/* ── 5. REVIEWS ───────────────────────────────────────────── */}
        <section id="product-reviews" className="reveal-up" data-reveal>
          <div className="container">
            <div className="reviews__head">
              <h2 className="reviews__title">Customer <span className="font-serif">Reviews</span></h2>
              <div className="reviews__head-actions">
                {reviewSummary && reviewSummary.count > 0 ? (
                  <button type="button" className="reviews__cta-secondary" onClick={() => openReviewsModal("read")}>
                    View all {reviewSummary.count} reviews
                  </button>
                ) : null}
                <button type="button" className="btn reviews__cta-primary" onClick={() => openReviewsModal("write")}>
                  Write a Review
                </button>
              </div>
            </div>

            {reviewSummary ? (
              <div className="reviews__body">
                <div className="reviews__summary">
                  <p className="reviews__avg">{reviewSummary.average.toFixed(1)}</p>
                  <Stars rating={reviewSummary.average} size="lg" />
                  <p className="reviews__total">Based on {reviewSummary.count} reviews</p>
                  <div className="reviews__bars">
                    {reviewSummary.distribution.map((count, i) => {
                      const star = 5 - i;
                      const pct = reviewSummary.count > 0 ? Math.round((count / reviewSummary.count) * 100) : 0;
                      return (
                        <div key={star} className="reviews__bar-row">
                          <span className="reviews__bar-label">{star}</span>
                          <div className="reviews__bar-track">
                            <div className="reviews__bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="reviews__bar-pct">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="reviews__list">
                  {reviewItems.slice(0, 3).map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-card__top">
                        <Stars rating={review.rating} />
                        {review.verified ? <span className="review-card__verified">Verified Purchase</span> : null}
                      </div>
                      <h3 className="review-card__title">{review.title}</h3>
                      <p className="review-card__body">{review.body}</p>
                      <div className="review-card__meta">
                        <span className="review-card__author">{review.author}</span>
                        <span className="review-card__date">{review.date}</span>
                      </div>
                    </div>
                  ))}
                  {reviewItems.length > 3 ? (
                    <button type="button" className="reviews__see-more" onClick={() => openReviewsModal("read")}>
                      See all {reviewItems.length} reviews
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="reviews__empty-state">
                <p>No reviews yet. Be the first to share your experience.</p>
                <button type="button" className="btn reviews__cta-primary" onClick={() => openReviewsModal("write")}>
                  Write a Review
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── 6. RELATED PRODUCTS ──────────────────────────────────── */}
        {related.length > 0 ? (
          <section id="product-related" className="reveal-up" data-reveal>
            <div className="container">
              <div className="related__head">
                <h2 className="related__title">More from <span className="font-serif">the edit</span></h2>
              </div>
              <div className="related__grid">
                {related.map((item) => (
                  <Link key={item.slug} href={`/products/${item.slug}`} className="related-card">
                    <div className="related-card__img-wrap" style={{ background: item.accentBg }}>
                      <Image
                        src={item.image}
                        alt={item.imageAlt}
                        fill
                        sizes="(max-width: 767px) 50vw, 25vw"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="related-card__body">
                      <p className="related-card__category">{item.category}</p>
                      <h3 className="related-card__name">{item.shortName}</h3>
                      <p className="related-card__price">{item.price}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

      </main>

      {/* ── REVIEWS MODAL ─────────────────────────────────────────── */}
      {reviewsModalOpen ? (
        <div className="reviews-modal__overlay" role="dialog" aria-modal="true" onClick={() => setReviewsModalOpen(false)}>
          <div className="reviews-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reviews-modal__header">
              <div className="reviews-modal__tabs">
                <button
                  type="button"
                  className={`reviews-modal__tab${reviewsModalTab === "read" ? " is-active" : ""}`}
                  onClick={() => setReviewsModalTab("read")}
                >
                  All Reviews{reviewSummary ? ` (${reviewSummary.count})` : ""}
                </button>
                <button
                  type="button"
                  className={`reviews-modal__tab${reviewsModalTab === "write" ? " is-active" : ""}`}
                  onClick={() => setReviewsModalTab("write")}
                >
                  Write a Review
                </button>
              </div>
              <button
                type="button"
                className="reviews-modal__close"
                onClick={() => setReviewsModalOpen(false)}
                aria-label="Close reviews"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <path d="M1 1l16 16M17 1L1 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="reviews-modal__body">
              {reviewsModalTab === "read" ? (
                <div className="reviews-modal__read">
                  <div className="reviews-modal__intro">
                    <span className="reviews-modal__eyebrow">Customer notes</span>
                    <h2>What people are saying</h2>
                    <p>
                      Read texture, routine, and result notes from customers who have tried this product.
                    </p>
                  </div>
                  {reviewSummary ? (
                    <div className="reviews-modal__summary">
                      <div className="reviews-modal__avg-block">
                        <p className="reviews__avg">{reviewSummary.average.toFixed(1)}</p>
                        <Stars rating={reviewSummary.average} size="lg" />
                        <p className="reviews__total">Based on {reviewSummary.count} reviews</p>
                      </div>
                      <div className="reviews__bars">
                        {reviewSummary.distribution.map((count, i) => {
                          const star = 5 - i;
                          const pct = reviewSummary.count > 0 ? Math.round((count / reviewSummary.count) * 100) : 0;
                          return (
                            <div key={star} className="reviews__bar-row">
                              <span className="reviews__bar-label">{star}</span>
                              <div className="reviews__bar-track">
                                <div className="reviews__bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="reviews__bar-pct">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="reviews__list">
                    {reviewItems.length > 0 ? (
                      reviewItems.map((review) => (
                        <div key={review.id} className="review-card">
                          <div className="review-card__top">
                            <Stars rating={review.rating} />
                            {review.verified ? <span className="review-card__verified">Verified Purchase</span> : null}
                          </div>
                          <h3 className="review-card__title">{review.title}</h3>
                          <p className="review-card__body">{review.body}</p>
                          <div className="review-card__meta">
                            <span className="review-card__author">{review.author}</span>
                            <span className="review-card__date">{review.date}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="reviews-modal__empty">
                        <p>No reviews yet.</p>
                        <button
                          type="button"
                          className="btn reviews__cta-primary"
                          onClick={() => setReviewsModalTab("write")}
                        >
                          Be the first to review
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="reviews-modal__form-wrap">
                  <div className="reviews-modal__intro reviews-modal__intro--form">
                    <span className="reviews-modal__eyebrow">Share your notes</span>
                    <h2>Review this product</h2>
                    <p>
                      Keep it useful: mention your skin concern, how you used it, and what changed.
                    </p>
                  </div>
                  <form className="review-form" onSubmit={handleSubmitReview}>
                    <div className="review-form__fields">
                      <label className="review-form__field">
                        <span className="review-form__label">Rating</span>
                        <select
                          className="review-form__select"
                          value={reviewForm.rating}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                          required
                        >
                          <option value={5}>5 — Excellent</option>
                          <option value={4}>4 — Good</option>
                          <option value={3}>3 — Average</option>
                          <option value={2}>2 — Fair</option>
                          <option value={1}>1 — Poor</option>
                        </select>
                      </label>

                      <label className="review-form__field">
                        <span className="review-form__label">Title</span>
                        <input
                          className="review-form__input"
                          type="text"
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Summarize your experience"
                          required
                        />
                      </label>

                      <label className="review-form__field review-form__field--wide">
                        <span className="review-form__label">Review</span>
                        <textarea
                          className="review-form__textarea"
                          value={reviewForm.body}
                          onChange={(e) => setReviewForm((prev) => ({ ...prev, body: e.target.value }))}
                          placeholder="Share what you liked, what improved, and who this is for."
                          rows={5}
                          required
                        />
                      </label>

                      {!user ? (
                        <>
                          <label className="review-form__field">
                            <span className="review-form__label">Name</span>
                            <input
                              className="review-form__input"
                              type="text"
                              value={reviewForm.author}
                              onChange={(e) => setReviewForm((prev) => ({ ...prev, author: e.target.value }))}
                              placeholder="Your name"
                              required
                            />
                          </label>
                          <label className="review-form__field">
                            <span className="review-form__label">Email</span>
                            <input
                              className="review-form__input"
                              type="email"
                              value={reviewForm.email}
                              onChange={(e) => setReviewForm((prev) => ({ ...prev, email: e.target.value }))}
                              placeholder="you@example.com"
                              required
                            />
                          </label>
                        </>
                      ) : null}
                    </div>

                    <div className="review-form__actions">
                      <button
                        type="submit"
                        className="btn review-form__submit"
                        disabled={reviewSubmitting || !product.wooId}
                      >
                        {reviewSubmitting ? "Submitting..." : "Send Review"}
                      </button>
                      {reviewsQuery.isFetching ? (
                        <span className="review-form__status">Refreshing reviews…</span>
                      ) : null}
                    </div>

                    {!product.wooId ? (
                      <p className="review-form__feedback review-form__feedback--error">
                        Reviews are currently unavailable for this product.
                      </p>
                    ) : null}
                    {reviewFeedback ? (
                      <p className={`review-form__feedback review-form__feedback--${reviewFeedback.tone}`}>
                        {reviewFeedback.message}
                      </p>
                    ) : null}
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
