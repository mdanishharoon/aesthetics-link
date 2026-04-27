"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useParallax } from "@/hooks/useParallax";

function QuickCartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="13" fill="white" />
      <path
        d="M8.77357 10.7989C8.81474 10.099 9.39438 9.55243 10.0955 9.55243H16.0403C16.7415 9.55243 17.3211 10.099 17.3623 10.7989L17.7342 17.1212C17.779 17.8819 17.1742 18.5233 16.4122 18.5233H9.72364C8.9617 18.5233 8.35692 17.8819 8.40167 17.1212L8.77357 10.7989Z"
        stroke="#424242"
        strokeWidth="0.601938"
      />
      <path
        d="M15.883 10.9417C15.883 8.76477 14.6224 7 13.0675 7C11.5125 7 10.252 8.76477 10.252 10.9417"
        stroke="#424242"
        strokeWidth="0.601938"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SliderArrowIcon() {
  return (
    <svg
      className="icon-arrow"
      width="13"
      height="8"
      viewBox="0 0 13 8"
      fill="none">
      <path
        d="M12.3536 4.35355C12.5488 4.15829 12.5488 3.84171 12.3536 3.64645L9.17157 0.464466C8.97631 0.269204 8.65973 0.269204 8.46447 0.464466C8.2692 0.659728 8.2692 0.976311 8.46447 1.17157L11.2929 4L8.46447 6.82843C8.2692 7.02369 8.2692 7.34027 8.46447 7.53553C8.65973 7.7308 8.97631 7.7308 9.17157 7.53553L12.3536 4.35355ZM0 4.5H12V3.5H0V4.5Z"
        fill="white"
      />
    </svg>
  );
}

type ProductCardProps = {
  href: string;
  category: string;
  title: string;
  price: string;
  imageSrc: string;
  imageHoverSrc: string;
  variant?: "pure" | "varnaya";
};

export type LandingExploreProduct = ProductCardProps;

function ProductCard({
  href,
  category,
  title,
  price,
  imageSrc,
  imageHoverSrc,
  isActive = false,
}: Omit<ProductCardProps, "variant"> & { isActive?: boolean }) {
  return (
    <Link
      href={href}
      className={`product__card${isActive ? " is-active" : ""}`}>
      <div className="product__card-media">
        <div className="product__card-head">
          <p className="product__card-category pill-fill">{category}</p>
          <div className="product__card-quickcart">
            <QuickCartIcon />
          </div>
        </div>
        <div className="product__card-img">
          <Image
            src={imageSrc}
            alt={title}
            fill
            sizes="280px"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="product__card-img2">
          <Image
            src={imageHoverSrc}
            alt=""
            fill
            sizes="280px"
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
      <div className="product__card-foot">
        <h3 className="product__card-title">{title}</h3>
        <p className="product-price">{price}</p>
      </div>
    </Link>
  );
}

function ProductRail({
  products,
  reverse = false,
}: {
  products: ProductCardProps[];
  reverse?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const animating = useRef(false);

  const drag = useRef({
    active: false,
    moved: false,
    startX: 0,
    trackX: 0,
    currentX: 0,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
  });

  /* card width + gap in px */
  const getMetrics = useCallback(() => {
    const track = trackRef.current;
    if (!track)
      return {
        cardW: 0,
        gap: 0,
        step: 0,
        count: products.length,
        maxOffset: 0,
      };
    const cards = track.querySelectorAll<HTMLElement>(".product__card");
    const firstCard = cards[0];
    if (!firstCard)
      return {
        cardW: 0,
        gap: 0,
        step: 0,
        count: products.length,
        maxOffset: 0,
      };
    const cardW = firstCard.offsetWidth;
    const secondCard = cards[1];
    const gap = secondCard
      ? secondCard.offsetLeft - firstCard.offsetLeft - cardW
      : 0;
    const step = cardW + gap;
    const trackW = (cards.length - 1) * step + cardW;
    const viewW =
      wrapperRef.current?.offsetWidth ?? track.parentElement?.offsetWidth ?? 0;
    const maxOffset = Math.max(0, trackW - viewW);
    return { cardW, gap, step, count: cards.length, maxOffset };
  }, [products.length]);

  /* animate track to offset */
  const animateTo = useCallback((targetOffset: number, duration = 400) => {
    const track = trackRef.current;
    if (!track) return;
    const start = drag.current.trackX;
    const dist = targetOffset - start;
    if (Math.abs(dist) < 1) {
      drag.current.trackX = targetOffset;
      track.style.transform = `translate3d(${-targetOffset}px, 0, 0)`;
      return;
    }
    animating.current = true;
    const t0 = performance.now();
    const step = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); /* easeOutCubic */
      const current = start + dist * ease;
      drag.current.trackX = current;
      track.style.transform = `translate3d(${-current}px, 0, 0)`;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        animating.current = false;
        drag.current.trackX = targetOffset;
      }
    };
    requestAnimationFrame(step);
  }, []);

  /* snap to nearest card index */
  const snapToIndex = useCallback(
    (index: number) => {
      const { step, count, maxOffset } = getMetrics();
      const clamped = Math.max(0, Math.min(count - 1, index));
      const offset = Math.min(clamped * step, maxOffset);
      setActiveIndex(clamped);
      animateTo(offset);
    },
    [getMetrics, animateTo],
  );

  /* find closest index from current track offset */
  const closestIndex = useCallback(() => {
    const { step, count } = getMetrics();
    if (step === 0) return 0;
    return Math.max(
      0,
      Math.min(count - 1, Math.round(drag.current.trackX / step)),
    );
  }, [getMetrics]);

  /* pointer handlers */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (animating.current) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    e.preventDefault();
    wrapper.setPointerCapture(e.pointerId);
    drag.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      trackX: drag.current.trackX,
      currentX: drag.current.trackX,
      velocity: 0,
      lastX: e.clientX,
      lastTime: performance.now(),
    };
    wrapper.classList.add("is-dragging");
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    e.preventDefault();
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;

    const now = performance.now();
    const dt = now - drag.current.lastTime;
    if (dt > 0) {
      drag.current.velocity = (e.clientX - drag.current.lastX) / dt;
    }
    drag.current.lastX = e.clientX;
    drag.current.lastTime = now;

    const { maxOffset } = getMetrics();
    const raw = drag.current.trackX - dx;
    /* rubber-band at edges */
    let offset: number;
    if (raw < 0) {
      offset = raw * 0.3;
    } else if (raw > maxOffset) {
      offset = maxOffset + (raw - maxOffset) * 0.3;
    } else {
      offset = raw;
    }
    drag.current.currentX = offset;
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${-offset}px, 0, 0)`;
  };

  const endDrag = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    wrapperRef.current?.classList.remove("is-dragging");

    /* commit the visual position */
    drag.current.trackX = drag.current.currentX;

    /* use velocity to determine which card to snap to */
    const { step } = getMetrics();
    const velocityThreshold = 0.3;
    let target = closestIndex();
    if (Math.abs(drag.current.velocity) > velocityThreshold && step > 0) {
      if (drag.current.velocity < 0)
        target = Math.ceil(drag.current.trackX / step);
      else target = Math.floor(drag.current.trackX / step);
    }
    snapToIndex(target);
  };

  const count = products.length;

  return (
    <div className={`product__rail${reverse ? " product__rail--reverse" : ""}`}>
      <div className="product__rail-nav">
        <button
          type="button"
          className="slider-arrow slider-arrow--prev"
          aria-label="Previous products"
          disabled={activeIndex === 0}
          onClick={() => snapToIndex(activeIndex - 1)}>
          <SliderArrowIcon />
        </button>
        <button
          type="button"
          className="slider-arrow"
          aria-label="Next products"
          disabled={activeIndex >= count - 1}
          onClick={() => snapToIndex(activeIndex + 1)}>
          <SliderArrowIcon />
        </button>
      </div>
      <div
        ref={wrapperRef}
        className="product__carousel-viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={(event) => {
          if (drag.current.moved) {
            event.preventDefault();
            event.stopPropagation();
            drag.current.moved = false;
          }
        }}>
        <div ref={trackRef} className="product__carousel-track">
          {products.map((product) => (
            <ProductCard key={product.href} {...product} isActive />
          ))}
        </div>
      </div>
    </div>
  );
}

const pureBrillianceProducts: ProductCardProps[] = [
  {
    href: "/products/aha-brightening-exfoliant-cleanser-face-wash",
    category: "Bestsellers",
    title: "AHA Brightening Exfoliant Cleanser/Face Wash",
    price: "\u00A349",
    imageSrc: "/images/product-pb-1.jpg",
    imageHoverSrc: "/images/product-pb-1-hover.jpg",
    variant: "pure",
  },
  {
    href: "/products/bio-exfoliant-brightening-sleeping-mask",
    category: "Bestsellers",
    title: "Bio Exfoliant Brightening Sleeping Mask",
    price: "\u00A349",
    imageSrc: "/images/product-pb-2.jpg",
    imageHoverSrc: "/images/product-pb-2-hover.jpg",
    variant: "pure",
  },
  {
    href: "/products/aha-brightening-exfoliant-toner-essence",
    category: "Bestsellers",
    title: "AHA Brightening Exfoliant Toner/Essence",
    price: "\u00A349",
    imageSrc: "/images/product-pb-3.jpg",
    imageHoverSrc: "/images/product-pb-3-hover.jpg",
    variant: "pure",
  },
];

const refinedBlendsProducts: ProductCardProps[] = [
  {
    href: "/products/rosehip-bakuchiol-skin-perfecting-oil",
    category: "New Arrivals",
    title: "Rosehip & Bakuchiol Skin Perfecting Oil",
    price: "\u00A349",
    imageSrc: "/images/product-vb-1.jpg",
    imageHoverSrc: "/images/product-vb-1-hover.jpg",
    variant: "varnaya",
  },
  {
    href: "/products/manjistha-saffron-moisture-gel",
    category: "New Arrivals",
    title: "Brightening Saffron Moisture Gel",
    price: "\u00A349",
    imageSrc: "/images/product-vb-2.jpg",
    imageHoverSrc: "/images/product-vb-2-hover.jpg",
    variant: "varnaya",
  },
  {
    href: "/products/acne-calming-herb-rescue-mask",
    category: "New Arrivals",
    title: "Clarifying Calm Rescue Mask",
    price: "\u00A349",
    imageSrc: "/images/product-vb-3.jpg",
    imageHoverSrc: "/images/product-vb-3-hover.jpg",
    variant: "varnaya",
  },
  {
    href: "/products/kumkumadi-radiance-facial-oil",
    category: "New Arrivals",
    title: "Luminous Renewal Facial Oil",
    price: "\u00A349",
    imageSrc: "/images/product-vb-4.jpg",
    imageHoverSrc: "/images/product-vb-4-hover.jpg",
    variant: "varnaya",
  },
];

export default function Explore({
  bestsellers,
  newArrivals,
}: {
  bestsellers?: LandingExploreProduct[];
  newArrivals?: LandingExploreProduct[];
}) {
  const img1Ref = useParallax<HTMLDivElement>(0.12);
  const img2Ref = useParallax<HTMLDivElement>(0.12);
  const bestSellerProducts =
    bestsellers && bestsellers.length > 0
      ? bestsellers
      : pureBrillianceProducts;
  const newArrivalProducts =
    newArrivals && newArrivals.length > 0 ? newArrivals : refinedBlendsProducts;

  return (
    <section id="explore" style={{ position: "relative", margin: 0 }}>
      <h2 className="explore__title text-center reveal-up" data-reveal>
        Explore <br />
        <span className="font-serif">pure efficacy</span>
      </h2>
      <div className="container" style={{ position: "relative" }}>
        <svg
          className="icon-arrowcurve"
          width="19"
          height="19"
          viewBox="0 0 19 19"
          fill="none">
          <path
            d="M7.29395 12.5401L12.539 17.7852L17.7841 12.5401"
            stroke="#414141"
            strokeWidth="1.15753"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M0.999999 0.999998L8.34308 0.999998C9.45594 0.999998 10.5232 1.44208 11.3101 2.22899C12.097 3.0159 12.5391 4.08318 12.5391 5.19604L12.5391 17.7842"
            stroke="#414141"
            strokeWidth="1.15753"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Bestsellers */}
      <div className="half__grid reveal-up" data-reveal>
        <div ref={img1Ref} className="half__grid-img parallax-scroll">
          <div className="media-img parallax-image">
            <Image
              alt="Bestsellers"
              src="/images/explore-1.jpg"
              width={1200}
              height={1440}
              sizes="50vw"
              style={{ objectFit: "cover" }}
              className="parallax-image-asset"
            />
          </div>
        </div>
        <div className="half__grid-content">
          <div className="half__grid-text">
            <h3 className="half__grid-title">
              Best <br />
              <span className="font-serif">Sellers</span>
            </h3>
            <Link href="/products" className="superscript">
              Shop all
            </Link>
          </div>
          <div className="half__grid-product">
            <ProductRail products={bestSellerProducts} reverse />
          </div>
          <p className="text-uppercase maxwidth">
            Our most-loved formulas, trusted by thousands.
          </p>
        </div>
      </div>

      {/* New Arrivals */}
      <div className="half__grid reveal-up" data-reveal>
        <div ref={img2Ref} className="half__grid-img parallax-scroll">
          <div className="media-img parallax-image">
            <Image
              alt="New Arrivals"
              src="/images/explore-2.jpg"
              width={1200}
              height={1440}
              sizes="50vw"
              style={{ objectFit: "cover" }}
              className="parallax-image-asset"
            />
          </div>
        </div>
        <div className="half__grid-content">
          <div className="half__grid-text">
            <h3 className="half__grid-title">
              New <br />
              <span className="font-serif">Arrivals</span>
            </h3>
            <Link href="/products" className="superscript">
              Shop all
            </Link>
          </div>
          <div className="half__grid-product">
            <ProductRail products={newArrivalProducts} />
          </div>
          <p className="text-uppercase maxwidth">
            The latest additions to our curated edit.
          </p>
        </div>
      </div>
    </section>
  );
}
