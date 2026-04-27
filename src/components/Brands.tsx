"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import type { StorefrontNavLink } from "@/types";

const FALLBACK_BRANDS = [
  {
    label: "Lumière Atelier",
    image: "/images/ingredients-clip.jpg",
    href: "/products?brand=lumiere-atelier",
  },
  {
    label: "Botan Botanics",
    image: "/images/explore-1.jpg",
    href: "/products?brand=botan-botanics",
  },
  {
    label: "Clinis Lab",
    image: "/images/journal-featured.jpg",
    href: "/products?brand=clinis-lab",
  },
  {
    label: "Velour Skin",
    image: "/images/explore-2.jpg",
    href: "/products?brand=velour-skin",
  },
  {
    label: "Verdant",
    image: "/images/journal-2.jpg",
    href: "/products?brand=verdant",
  },
  {
    label: "Éclat London",
    image: "/images/connect-1.jpg",
    href: "/products?brand=eclat-london",
  },
] as const;

const BRAND_IMAGE_FALLBACKS: Record<string, string> = {
  "glutanex": "/images/explore-1.jpg",
  "dermapen": "/images/explore-2.jpg",
  "luna-microcare": "/images/ingredients-clip.jpg",
};

const BRAND_IMAGE_POOL = [
  "/images/ingredients-clip.jpg",
  "/images/explore-1.jpg",
  "/images/journal-featured.jpg",
  "/images/explore-2.jpg",
  "/images/journal-2.jpg",
  "/images/connect-1.jpg",
] as const;

function extractBrandSlugFromHref(href: string): string {
  try {
    const queryIndex = href.indexOf("?");
    if (queryIndex === -1) {
      return "";
    }
    const search = href.slice(queryIndex + 1);
    const params = new URLSearchParams(search);
    return (params.get("brand") ?? "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function resolveBrandImage(brand: StorefrontNavLink, index: number): string {
  if (typeof brand.image === "string" && brand.image.trim()) {
    return brand.image.trim();
  }

  const slug = extractBrandSlugFromHref(brand.href);
  if (slug && BRAND_IMAGE_FALLBACKS[slug]) {
    return BRAND_IMAGE_FALLBACKS[slug];
  }

  return BRAND_IMAGE_POOL[index % BRAND_IMAGE_POOL.length];
}

export default function Brands({
  brands,
}: {
  brands?: StorefrontNavLink[];
}) {
  const source = brands ?? FALLBACK_BRANDS;
  const tiles = source.slice(0, 6).map((brand, index) => ({
    name: brand.label,
    href: brand.href,
    image: resolveBrandImage(brand, index),
  }));

  return (
    <section id="brands">
      <div className="container">
        <div className="brands__header reveal-up" data-reveal>
          <h2 className="brands__title">
            Brands <span className="font-serif">We Carry</span>
          </h2>
          <Link href="/brands" className="brands__viewall superscript">
            View All Brands
            <svg
              width="13"
              height="8"
              viewBox="0 0 13 8"
              fill="none"
              aria-hidden="true"
              style={{ marginLeft: "0.6rem" }}
            >
              <path
                d="M12.3536 4.35355C12.5488 4.15829 12.5488 3.84171 12.3536 3.64645L9.17157 0.464466C8.97631 0.269204 8.65973 0.269204 8.46447 0.464466C8.2692 0.659728 8.2692 0.976311 8.46447 1.17157L11.2929 4L8.46447 6.82843C8.2692 7.02369 8.2692 7.34027 8.46447 7.53553C8.65973 7.7308 8.97631 7.7308 9.17157 7.53553L12.3536 4.35355ZM0 4.5H12V3.5H0V4.5Z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>
        <div className="brands__grid">
          {tiles.map((brand, i) => (
            <Link
              key={brand.href}
              href={brand.href}
              className="brands__tile reveal-up-stagger"
              data-reveal
              style={{ "--stagger": `${i * 0.07}s` } as React.CSSProperties}
            >
              <div className="brands__tile-img">
                <Image src={brand.image} alt={brand.name} fill sizes="(max-width: 768px) 50vw, 16vw" style={{ objectFit: "cover" }} />
              </div>
              <div className="brands__tile-overlay" />
              <div className="brands__tile-content">
                <h3 className="brands__tile-name">{brand.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
