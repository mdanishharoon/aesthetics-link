import type React from "react";
import Image from "next/image";
import Link from "next/link";

function QuickCartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
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

export type LandingFeaturedProduct = {
  href: string;
  category: string;
  title: string;
  price: string;
  imageSrc: string;
  imageHoverSrc: string;
  bg: string;
};

const FEATURED_PRODUCTS: LandingFeaturedProduct[] = [
  {
    href: "/products/aha-brightening-exfoliant-cleanser-face-wash",
    category: "Bestseller",
    title: "AHA Brightening Exfoliant Cleanser",
    price: "£49",
    imageSrc: "/images/product-pb-1.jpg",
    imageHoverSrc: "/images/product-pb-1-hover.jpg",
    bg: "#F1CCCF",
  },
  {
    href: "/products/bio-exfoliant-brightening-sleeping-mask",
    category: "Bestseller",
    title: "Bio Exfoliant Brightening Sleeping Mask",
    price: "£49",
    imageSrc: "/images/product-pb-2.jpg",
    imageHoverSrc: "/images/product-pb-2-hover.jpg",
    bg: "#F1CCCF",
  },
  {
    href: "/products/rosehip-bakuchiol-skin-perfecting-oil",
    category: "Bestseller",
    title: "Rosehip & Bakuchiol Skin Perfecting Oil",
    price: "£49",
    imageSrc: "/images/product-vb-1.jpg",
    imageHoverSrc: "/images/product-vb-1-hover.jpg",
    bg: "#D8D0C4",
  },
  {
    href: "/products/manjistha-saffron-moisture-gel",
    category: "Bestseller",
    title: "Brightening Saffron Moisture Gel",
    price: "£49",
    imageSrc: "/images/product-vb-2.jpg",
    imageHoverSrc: "/images/product-vb-2-hover.jpg",
    bg: "#D8D0C4",
  },
] as const;

export default function FeaturedProducts({
  products,
}: {
  products?: LandingFeaturedProduct[];
}) {
  const featuredProducts = products && products.length > 0 ? products : FEATURED_PRODUCTS;

  return (
    <section id="featured-products">
      <div className="container">
        <div className="featured__header reveal-up" data-reveal>
          <p className="featured__label superscript">Bestsellers</p>
          <Link href="/products" className="featured__viewall superscript">
            Shop all
            <svg
              width="13"
              height="8"
              viewBox="0 0 13 8"
              fill="none"
              aria-hidden="true"
              style={{ marginLeft: "0.5rem" }}
            >
              <path
                d="M12.3536 4.35355C12.5488 4.15829 12.5488 3.84171 12.3536 3.64645L9.17157 0.464466C8.97631 0.269204 8.65973 0.269204 8.46447 0.464466C8.2692 0.659728 8.2692 0.976311 8.46447 1.17157L11.2929 4L8.46447 6.82843C8.2692 7.02369 8.2692 7.34027 8.46447 7.53553C8.65973 7.7308 8.97631 7.7308 9.17157 7.53553L12.3536 4.35355ZM0 4.5H12V3.5H0V4.5Z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>

        <div className="featured__grid">
          {featuredProducts.map((product, i) => (
            <Link
              key={product.href}
              href={product.href}
              className="product__card is-active reveal-up-stagger"
              data-reveal
              style={{ backgroundColor: product.bg, "--stagger": `${i * 0.1}s` } as React.CSSProperties}
            >
              <div className="product__card-head">
                <p className="product__card-category pill-fill">{product.category}</p>
                <div className="product__card-quickcart">
                  <QuickCartIcon />
                </div>
              </div>
              <div className="product__content">
                <div className="product__card-img">
                  <Image
                    src={product.imageSrc}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    style={{ objectFit: "contain" }}
                  />
                </div>
                <div className="product__card-img2">
                  <Image
                    src={product.imageHoverSrc}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    style={{ objectFit: "contain" }}
                  />
                </div>
                <div className="product__card-foot">
                  <h3 className="product__card-title">{product.title}</h3>
                  <p className="product-price">{product.price}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
