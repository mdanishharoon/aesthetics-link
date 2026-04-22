import type React from "react";
import Image from "next/image";
import Link from "next/link";

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
            <article
              key={product.href}
              className="shop-product-card reveal-up-stagger"
              data-reveal
              style={{ "--card-accent": product.bg, "--stagger": `${i * 0.1}s` } as React.CSSProperties}
            >
              <Link href={product.href} className="shop-product-card__inner">
                <div className="shop-product-card__image-wrap featured-card__image-wrap">
                  <div className="shop-product-card__image-overlay" />
                  <Image
                    src={product.imageSrc}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="shop-product-card__img featured-card__img"
                  />
                  <Image
                    src={product.imageHoverSrc}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="shop-product-card__img featured-card__img--hover"
                  />
                  <span className="shop-product-card__category pill-fill">{product.category}</span>
                </div>

                <div className="shop-product-card__body">
                  <div className="shop-product-card__text">
                    <h3 className="shop-product-card__name">{product.title}</h3>
                  </div>
                  <p className="shop-product-card__price product-price">{product.price}</p>
                </div>
              </Link>

              <Link href={product.href} className="shop-product-card__cta shop-product-card__cta--link" aria-label={`Shop ${product.title}`}>
                <span>Shop Now</span>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
