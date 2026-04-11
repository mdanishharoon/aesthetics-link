"use client";

import Image from "next/image";
import Link from "next/link";

const BRANDS = [
  {
    name: "Lumière Atelier",
    category: "Luxury Facial Care",
    image: "/images/ingredients-clip.jpg",
    href: "/brands/lumiere-atelier",
  },
  {
    name: "Botan Botanics",
    category: "Plant-Powered Science",
    image: "/images/explore-1.jpg",
    href: "/brands/botan-botanics",
  },
  {
    name: "Clinis Lab",
    category: "Clinical Actives",
    image: "/images/journal-featured.jpg",
    href: "/brands/clinis-lab",
  },
  {
    name: "Velour Skin",
    category: "Hydration & Barrier",
    image: "/images/explore-2.jpg",
    href: "/brands/velour-skin",
  },
  {
    name: "Verdant",
    category: "Sustainable Beauty",
    image: "/images/journal-2.jpg",
    href: "/brands/verdant",
  },
  {
    name: "Éclat London",
    category: "Heritage Formulation",
    image: "/images/connect-1.jpg",
    href: "/brands/eclat-london",
  },
] as const;

export default function Brands() {
  return (
    <section id="brands" className="reveal-up" data-reveal>
      <div className="container">
        <div className="brands__header">
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
          {BRANDS.map((brand, i) => (
            <Link
              key={brand.href}
              href={brand.href}
              className="brands__tile"
              style={{ transitionDelay: `${i * 0.06}s` }}
            >
              <div className="brands__tile-img">
                <Image src={brand.image} alt={brand.name} fill sizes="(max-width: 768px) 50vw, 16vw" style={{ objectFit: "cover" }} />
              </div>
              <div className="brands__tile-overlay" />
              <div className="brands__tile-content">
                <p className="brands__tile-category superscript">{brand.category}</p>
                <h3 className="brands__tile-name">{brand.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
