"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import type { StorefrontNavLink } from "@/types";

const CONCERN_ICONS = [
  "/images/icon-clean-beyond-reproach.svg",
  "/images/icon-potent-multi-tasking.svg",
  "/images/icon-real-results.svg",
  "/images/icon-highest-standards.svg",
  "/images/icon-radical-transparency.svg",
  "/images/icon-conscious-responsible.svg",
] as const;

const DEFAULT_CONCERNS: StorefrontNavLink[] = [
  { label: "Brightening", href: "/products?concern=brightening-moisturiser" },
  { label: "Hydration", href: "/products?concern=hydration-serum" },
  { label: "Anti-Ageing", href: "/products?concern=overnight-treatment" },
  { label: "SPF Protection", href: "/products?concern=uv-protection" },
  { label: "Eye Care", href: "/products?concern=eye-treatment" },
  { label: "Targeted Treatment", href: "/products?concern=targeted-treatment" },
];

export default function ShopByConcern({
  concerns,
}: {
  concerns?: StorefrontNavLink[];
}) {
  const concernTiles = (concerns ?? DEFAULT_CONCERNS).slice(0, 6);

  return (
    <section id="concerns">
      <div className="container">
        <div className="concerns__header reveal-up" data-reveal>
          <h2 className="concerns__title">
            Shop by <span className="font-serif">Target Area</span>
          </h2>
        </div>
        <div className="concerns__grid">
          {concernTiles.map((concern, i) => (
            <Link
              key={concern.href}
              href={concern.href}
              className="concerns__tile reveal-up-stagger"
              data-reveal
              style={{ "--stagger": `${i * 0.06}s` } as React.CSSProperties}
            >
              <div className="concerns__tile-icon">
                <Image
                  src={CONCERN_ICONS[i % CONCERN_ICONS.length] ?? CONCERN_ICONS[0]}
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={32}
                  unoptimized
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>
              <p className="concerns__tile-label">{concern.label}</p>
              <span className="concerns__tile-cta superscript">
                Shop
                <svg
                  width="11"
                  height="7"
                  viewBox="0 0 13 8"
                  fill="none"
                  aria-hidden="true"
                  style={{ marginLeft: "0.4rem" }}
                >
                  <path
                    d="M12.3536 4.35355C12.5488 4.15829 12.5488 3.84171 12.3536 3.64645L9.17157 0.464466C8.97631 0.269204 8.65973 0.269204 8.46447 0.464466C8.2692 0.659728 8.2692 0.976311 8.46447 1.17157L11.2929 4L8.46447 6.82843C8.2692 7.02369 8.2692 7.34027 8.46447 7.53553C8.65973 7.7308 8.97631 7.7308 9.17157 7.53553L12.3536 4.35355ZM0 4.5H12V3.5H0V4.5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
