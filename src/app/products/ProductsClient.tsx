"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";
import { useStorefrontNavigation } from "@/components/StorefrontNavigationProvider";
import { getWholesalePrices } from "@/lib/auth/client";
import { useAuth } from "@/components/AuthProvider";
import {
  addCartItem,
  fetchCart,
  getCachedCartSnapshot,
  removeCartItem,
  updateCartItemQuantity,
} from "@/lib/storefront/client";
import type { StorefrontCart, StorefrontCatalogProduct } from "@/lib/storefront/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function normalizeFilterSlug(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toFilterLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function extractNavFilterOptions(
  links: Array<{ href: string; label: string }>,
  key: "concern" | "brand",
): Array<{ slug: string; label: string }> {
  const deduped = new Map<string, string>();

  for (const link of links) {
    if (!link?.href || !link?.label) continue;

    let slug = "";
    try {
      const url = new URL(link.href, "https://storefront.local");
      slug = normalizeFilterSlug(url.searchParams.get(key));
    } catch {
      slug = "";
    }

    if (!slug || deduped.has(slug)) continue;
    deduped.set(slug, link.label);
  }

  return Array.from(deduped.entries()).map(([slug, label]) => ({ slug, label }));
}

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

function CartSidebar({
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

function ShopCard({
  product,
  isWholesaleViewer,
  onAddToCart,
}: {
  product: StorefrontCatalogProduct;
  isWholesaleViewer: boolean;
  onAddToCart: (product: StorefrontCatalogProduct) => Promise<void>;
}) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requiresOptions = product.hasOptions === true || product.productType === "variable";
  const isOutOfStock = product.inStock === false || product.stockStatus === "outofstock";
  const isUnavailable = product.id <= 0 || isOutOfStock;
  const canSeeWholesalePrice = isWholesaleViewer && product.priceSource === "wholesale";
  const visiblePrice = canSeeWholesalePrice ? product.price : product.retailPrice ?? product.price;
  const visibleRegularPrice =
    canSeeWholesalePrice && product.hasDiscount && product.regularPrice && product.regularPrice !== product.price
      ? product.regularPrice
      : null;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleAdd = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (loading || isUnavailable) {
      return;
    }

    setFeedback(null);
    setLoading(true);
    setAdded(true);
    try {
      await onAddToCart(product);
    } catch (error) {
      setAdded(false);
      setFeedback(error instanceof Error ? error.message : "Unable to add this item to your bag.");
    } finally {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setAdded(false), 1800);
      setLoading(false);
    }
  };

  return (
    <article className="shop-product-card" style={{ "--card-accent": product.accentBg } as React.CSSProperties}>
      <Link href={`/products/${product.slug}`} className="shop-product-card__inner">
        <div className="shop-product-card__image-wrap">
          <div className="shop-product-card__image-overlay" />
          <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 768px) 50vw, 25vw" style={{ objectFit: "cover" }} className="shop-product-card__img" />
          <span className="shop-product-card__category pill-fill">{product.category}</span>
        </div>

        <div className="shop-product-card__body">
          <div className="shop-product-card__text">
            <h3 className="shop-product-card__name">{product.shortName}</h3>
            <p className="shop-product-card__tagline">{product.tagline}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <p className="shop-product-card__price product-price" style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              {visibleRegularPrice ? (
                <span style={{ opacity: 0.55, textDecoration: "line-through", fontSize: "0.9em" }}>{visibleRegularPrice}</span>
              ) : null}
              <span>{visiblePrice}</span>
            </p>
            {canSeeWholesalePrice ? (
              <span style={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-gray2)" }}>
                Wholesale
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {requiresOptions && !isOutOfStock ? (
        <Link
          href={`/products/${product.slug}`}
          className="shop-product-card__cta shop-product-card__cta--link"
          aria-label={`Choose options for ${product.shortName}`}
        >
          <span>Select Options</span>
        </Link>
      ) : (
        <button
          className={`shop-product-card__cta${added ? " added" : ""}${isUnavailable ? " is-disabled" : ""}`}
          onClick={handleAdd}
          aria-label={
            isOutOfStock ? `${product.shortName} is out of stock` : `Add ${product.shortName} to bag`
          }
          disabled={isUnavailable}
          aria-disabled={isUnavailable}
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
              <span>
                {loading
                  ? "Adding..."
                  : isOutOfStock
                    ? "Out of Stock"
                    : product.id > 0
                      ? "Add to Bag"
                      : "Unavailable"}
              </span>
            </>
          )}
        </button>
      )}
      {!isOutOfStock && feedback ? (
        <p className="shop-product-card__feedback" role="status" aria-live="polite">
          {feedback}
        </p>
      ) : null}
    </article>
  );
}

export default function ProductsClient({
  initialProducts,
  initialConcern,
  initialBrand,
}: {
  initialProducts: StorefrontCatalogProduct[];
  initialConcern: string;
  initialBrand: string;
}) {
  const navigation = useStorefrontNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeConcern, setActiveConcern] = useState(initialConcern);
  const [activeBrand, setActiveBrand] = useState(initialBrand);
  const [cartOpen, setCartOpen] = useState(false);

  const concernFilters = useMemo(() => {
    const links = navigation?.concerns ?? [];
    return extractNavFilterOptions(links, "concern");
  }, [navigation]);

  const brandFilters = useMemo(() => {
    const links = navigation?.brands ?? [];
    return extractNavFilterOptions(links, "brand");
  }, [navigation]);

  const productIds = useMemo(
    () => initialProducts.map((product) => product.id).filter((id) => Number.isInteger(id) && id > 0),
    [initialProducts],
  );

  const { user } = useAuth();

  const isWholesaleViewer = Boolean(
    user &&
      user.role === "wholesale_customer" &&
      user.clinicStatus === "approved" &&
      user.wholesaleApproved,
  );

  const wholesalePricesQuery = useQuery({
    queryKey: ["auth", "wholesale-prices", productIds.join(",")],
    queryFn: () => getWholesalePrices(productIds),
    enabled: isWholesaleViewer && productIds.length > 0,
  });

  const products = useMemo(() => {
    if (!isWholesaleViewer || !wholesalePricesQuery.data?.isWholesaleViewer) {
      return initialProducts.map((product) => ({
        ...product,
        priceSource: "retail" as const,
        price: product.retailPrice ?? product.price,
        regularPrice: null,
        hasDiscount: false,
      }));
    }

    return initialProducts.map((product) => {
      const entry = wholesalePricesQuery.data?.prices[String(product.id)];
      if (!entry || entry.source !== "wholesale") {
        return {
          ...product,
          priceSource: "retail" as const,
          price: product.retailPrice ?? product.price,
          regularPrice: null,
          hasDiscount: false,
        };
      }

      return {
        ...product,
        retailPrice: product.retailPrice ?? product.price,
        price: entry.priceLabel,
        regularPrice: entry.hasDiscount ? entry.regularPriceLabel : null,
        hasDiscount: entry.hasDiscount,
        priceSource: "wholesale" as const,
      };
    });
  }, [initialProducts, isWholesaleViewer, wholesalePricesQuery.data]);

  const knownBrandSlugs = useMemo(
    () => Array.from(new Set(brandFilters.map((brand) => normalizeFilterSlug(brand.slug)).filter(Boolean))),
    [brandFilters],
  );

  const productCategoryIndex = useMemo(() => {
    return products.map((product) => {
      const allSlugs = Array.from(
        new Set(
          [product.categorySlug, ...product.categorySlugs]
            .map((slug) => normalizeFilterSlug(slug))
            .filter(Boolean),
        ),
      );

      return {
        product,
        allSlugs,
      };
    });
  }, [products]);

  const productBrandIndex = useMemo(() => {
    return products.map((product) => {
      const explicitSlugs = [product.brandSlug, ...(product.brandSlugs ?? [])]
        .map((slug) => normalizeFilterSlug(slug))
        .filter(Boolean);
      const categorySlugs = [product.categorySlug, ...product.categorySlugs]
        .map((slug) => normalizeFilterSlug(slug))
        .filter(Boolean);
      const productSlug = normalizeFilterSlug(product.slug);
      const productNameSlug = normalizeFilterSlug(product.name);

      const inferredSlugs = knownBrandSlugs.filter((brandSlug) => {
        if (categorySlugs.includes(brandSlug)) {
          return true;
        }
        if (productSlug === brandSlug || productSlug.startsWith(`${brandSlug}-`)) {
          return true;
        }
        if (productNameSlug === brandSlug || productNameSlug.startsWith(`${brandSlug}-`)) {
          return true;
        }
        return false;
      });

      return {
        product,
        allSlugs: Array.from(new Set([...explicitSlugs, ...inferredSlugs])),
      };
    });
  }, [products, knownBrandSlugs]);

  const concernBuckets = useMemo(() => {
    const buckets = new Map<string, StorefrontCatalogProduct[]>();

    for (const entry of productCategoryIndex) {
      for (const slug of entry.allSlugs) {
        const existing = buckets.get(slug) ?? [];
        existing.push(entry.product);
        buckets.set(slug, existing);
      }
    }

    return buckets;
  }, [productCategoryIndex]);

  const brandBuckets = useMemo(() => {
    const buckets = new Map<string, StorefrontCatalogProduct[]>();

    for (const entry of productBrandIndex) {
      for (const slug of entry.allSlugs) {
        const existing = buckets.get(slug) ?? [];
        existing.push(entry.product);
        buckets.set(slug, existing);
      }
    }

    return buckets;
  }, [productBrandIndex]);

  const concernOptions = useMemo(() => {
    const baseOptions =
      concernFilters.length === 0 ? [{ slug: "all", label: "All" }] : [{ slug: "all", label: "All" }, ...concernFilters];
    const normalizedActive = normalizeFilterSlug(activeConcern);

    if (!normalizedActive || normalizedActive === "all") {
      return baseOptions;
    }

    if (baseOptions.some((option) => option.slug === normalizedActive)) {
      return baseOptions;
    }

    return [{ slug: normalizedActive, label: toFilterLabel(normalizedActive) || normalizedActive }, ...baseOptions];
  }, [concernFilters, activeConcern]);

  const brandOptions = useMemo(() => {
    const baseOptions =
      brandFilters.length === 0 ? [{ slug: "all", label: "All" }] : [{ slug: "all", label: "All" }, ...brandFilters];
    const normalizedActive = normalizeFilterSlug(activeBrand);

    if (!normalizedActive || normalizedActive === "all") {
      return baseOptions;
    }

    if (baseOptions.some((option) => option.slug === normalizedActive)) {
      return baseOptions;
    }

    return [{ slug: normalizedActive, label: toFilterLabel(normalizedActive) || normalizedActive }, ...baseOptions];
  }, [brandFilters, activeBrand]);

  useEffect(() => {
    setActiveConcern(initialConcern);
  }, [initialConcern]);

  useEffect(() => {
    setActiveBrand(initialBrand);
  }, [initialBrand]);
  const [initialCachedCart] = useState<StorefrontCart | null>(() => getCachedCartSnapshot());
  const cartQuery = useQuery({
    queryKey: ["storefront", "cart"],
    queryFn: fetchCart,
    initialData: initialCachedCart ?? EMPTY_CART,
  });

  const addCartMutation = useMutation({
    mutationFn: ({ product }: { product: StorefrontCatalogProduct }) => addCartItem(product.id, 1),
    onMutate: async ({ product }) => {
      await queryClient.cancelQueries({ queryKey: ["storefront", "cart"] });
      const snapshot = queryClient.getQueryData<StorefrontCart>(["storefront", "cart"]);
      const current = snapshot ?? EMPTY_CART;
      const existingItem = current.items.find((item) => item.productId === product.id);
      const optimistic: StorefrontCart = existingItem
        ? {
            ...current,
            itemCount: current.itemCount + 1,
            items: current.items.map((item) =>
              item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
            ),
          }
        : {
            ...current,
            itemCount: current.itemCount + 1,
            items: [
              ...current.items,
              {
                key: `optimistic-${product.id}`,
                productId: product.id,
                slug: product.slug,
                name: product.name,
                shortName: product.shortName,
                quantity: 1,
                price: product.retailPrice ?? product.price,
                lineTotal: product.retailPrice ?? product.price,
                variations: [],
                image: product.image,
                imageAlt: product.imageAlt,
                accentBg: product.accentBg,
              },
            ],
          };
      queryClient.setQueryData(["storefront", "cart"], optimistic);
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
    mutationFn: ({ key, quantity }: { key: string; quantity: number }) => updateCartItemQuantity(key, quantity),
    onMutate: async ({ key, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ["storefront", "cart"] });
      const snapshot = queryClient.getQueryData<StorefrontCart>(["storefront", "cart"]);
      if (snapshot) {
        const optimistic: StorefrontCart = {
          ...snapshot,
          items: snapshot.items.map((item) => (item.key === key ? { ...item, quantity } : item)),
          itemCount: snapshot.items.reduce((sum, item) => sum + (item.key === key ? quantity : item.quantity), 0),
        };
        queryClient.setQueryData(["storefront", "cart"], optimistic);
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

  const removeCartMutation = useMutation({
    mutationFn: (key: string) => removeCartItem(key),
    onMutate: async (key) => {
      await queryClient.cancelQueries({ queryKey: ["storefront", "cart"] });
      const snapshot = queryClient.getQueryData<StorefrontCart>(["storefront", "cart"]);
      if (snapshot) {
        const removed = snapshot.items.find((item) => item.key === key);
        const optimistic: StorefrontCart = {
          ...snapshot,
          items: snapshot.items.filter((item) => item.key !== key),
          itemCount: snapshot.itemCount - (removed?.quantity ?? 1),
        };
        queryClient.setQueryData(["storefront", "cart"], optimistic);
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

  const normalizedActiveConcern = normalizeFilterSlug(activeConcern);
  const normalizedActiveBrand = normalizeFilterSlug(activeBrand);
  const concernFiltered =
    normalizedActiveConcern === "all"
      ? products
      : concernBuckets.get(normalizedActiveConcern) ?? [];
  const brandFiltered =
    normalizedActiveBrand === "all"
      ? products
      : brandBuckets.get(normalizedActiveBrand) ?? [];
  const filtered =
    normalizedActiveConcern === "all" && normalizedActiveBrand === "all"
      ? products
      : normalizedActiveConcern === "all"
        ? brandFiltered
        : normalizedActiveBrand === "all"
          ? concernFiltered
          : (() => {
              const brandSet = new Set(brandFiltered.map((product) => product.slug));
              return concernFiltered.filter((product) => brandSet.has(product.slug));
            })();

  const syncFiltersToUrl = (nextConcern: string, nextBrand: string): void => {
    if (typeof window === "undefined") {
      return;
    }

    const normalizedConcern = normalizeFilterSlug(nextConcern);
    const normalizedBrand = normalizeFilterSlug(nextBrand);
    const params = new URLSearchParams(window.location.search);

    if (!normalizedConcern || normalizedConcern === "all") {
      params.delete("concern");
      params.delete("category");
    } else {
      params.set("concern", normalizedConcern);
      params.delete("category");
    }

    if (!normalizedBrand || normalizedBrand === "all") {
      params.delete("brand");
    } else {
      params.set("brand", normalizedBrand);
    }

    const nextQuery = params.toString();
    const pathname = window.location.pathname || "/products";
    const nextHref = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentHref = `${window.location.pathname}${window.location.search}`;

    if (nextHref !== currentHref) {
      router.replace(nextHref, { scroll: false });
    }
  };

  const handleConcernSelect = (nextConcern: string): void => {
    setActiveConcern(nextConcern);
    syncFiltersToUrl(nextConcern, activeBrand);
  };

  const handleBrandSelect = (nextBrand: string): void => {
    setActiveBrand(nextBrand);
    syncFiltersToUrl(activeConcern, nextBrand);
  };

  const handleClearFilters = (): void => {
    setActiveConcern("all");
    setActiveBrand("all");
    syncFiltersToUrl("all", "all");
  };

  async function refreshCart(): Promise<void> {
    await cartQuery.refetch();
  }

  async function handleAddToCart(product: StorefrontCatalogProduct): Promise<void> {
    setCartOpen(true);
    await addCartMutation.mutateAsync({ product });
  }

  async function handleRemoveFromCart(key: string): Promise<void> {
    await removeCartMutation.mutateAsync(key);
  }

  async function handleUpdateQty(key: string, nextQty: number): Promise<void> {
    await updateCartMutation.mutateAsync({ key, quantity: nextQty });
  }

  const cart = cartQuery.data ?? EMPTY_CART;
  const cartBusy = addCartMutation.isPending || updateCartMutation.isPending || removeCartMutation.isPending;
  const cartCount = cart.itemCount;

  return (
    <div className="shop-page">
      <MotionProvider />
      <Header />

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
        <section id="shop-hero">
          <div className="shop-hero__bg" />

          <div className="shop-hero__portrait reveal-up" data-reveal>
            <Image src="/images/skincare-hero-portrait.png" alt="Skincare Portrait" width={400} height={600} style={{ height: "100%", width: "auto", objectFit: "contain", objectPosition: "bottom center" }} />
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

          <button
            className="shop-hero__cart-btn"
            onClick={() => {
              setCartOpen(true);
              void refreshCart();
            }}
            aria-label="Open cart"
          >
            <CartIcon />
            {cartCount > 0 && <span className="shop-hero__cart-count">{cartCount}</span>}
          </button>
        </section>

        <section id="shop-main">
          <div className="container shop-layout">
            <aside className="shop-sidebar reveal-up" data-reveal>
              <h3 className="shop-sidebar__title">
                <FilterIcon /> Filters
              </h3>

              <div className="shop-sidebar__group">
                <p className="shop-sidebar__group-label superscript">By Concern</p>
                <ul className="shop-sidebar__list" role="group" aria-label="Filter products by concern">
                  {concernOptions.map((concern) => (
                    <li key={concern.slug}>
                      <button
                        className={`shop-sidebar__link${activeConcern === concern.slug ? " active" : ""}`}
                        onClick={() => handleConcernSelect(concern.slug)}
                      >
                        {concern.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="shop-sidebar__group">
                <p className="shop-sidebar__group-label superscript">By Brand</p>
                <ul className="shop-sidebar__list" role="group" aria-label="Filter products by brand">
                  {brandOptions.map((brand) => (
                    <li key={brand.slug}>
                      <button
                        className={`shop-sidebar__link${activeBrand === brand.slug ? " active" : ""}`}
                        onClick={() => handleBrandSelect(brand.slug)}
                      >
                        {brand.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
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
                      isWholesaleViewer={isWholesaleViewer}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              ) : (
                <div className="shop-empty">
                  <p>No products found for this filter combination.</p>
                  <button
                    className="btn"
                    onClick={handleClearFilters}
                  >
                    View all products
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

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
                    <Image src={item.icon} alt={item.label} width={38} height={38} unoptimized style={{ width: "2.4rem", height: "2.4rem", objectFit: "contain" }} />
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
