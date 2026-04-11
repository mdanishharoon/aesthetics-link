"use client";

import Image from "next/image";
import { useRef } from "react";
import { useParallaxMultiple } from "@/hooks/useParallax";

const INGREDIENTS = [
  {
    icon: "/images/icon-clean-beyond-reproach.svg",
    title: "Clinically Validated",
    desc: "Every brand we carry is held to rigorous dermal science standards — nothing makes it onto our shelves without clinical evidence behind it.",
  },
  {
    icon: "/images/icon-radical-transparency.svg",
    title: "Full Transparency",
    desc: "We only work with brands who fully disclose their formulations. No hidden ingredients, no proprietary black boxes — just honest skincare.",
  },
  {
    icon: "/images/icon-potent-multi-tasking.svg",
    title: "Potent & Targeted",
    desc: "We curate formulas where every active earns its place — precisely dosed, backed by science, and chosen for visible, measurable results.",
  },
  {
    icon: "/images/icon-conscious-responsible.svg",
    title: "Responsible Beauty",
    desc: "Our brands are PETA Certified Vegan and Cruelty Free, housed in responsible packaging and produced with sustainability at the core.",
  },
] as const;

function IngredientItem({
  icon,
  title,
  desc,
  speed,
}: {
  icon: string;
  title: string;
  desc: string;
  speed?: number;
}) {
  return (
    <div
      className="ingredients__item parallax-scroll"
      data-parallax
      data-parallax-speed={speed ?? 3}
    >
      <div className="ingredients__item-icon">
        <Image src={icon} alt={title} width={40} height={40} unoptimized style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      <h3 className="ingredients__item-title text-none">{title}</h3>
      <p className="ingredients__item-desc">{desc}</p>
    </div>
  );
}

export default function Ingredients() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useParallaxMultiple(wrapperRef, "[data-parallax]", 0.03);

  return (
    <section id="ingredients" className="reveal-up" data-reveal>
      <div className="container">
        <div className="ingredients__text">
          <h2 className="ingredients__title">
            Expert-Curated, Results-Driven,{" "}
            <span className="ingredients__title-serif font-serif text-underline-border">
              Trusted.
            </span>
          </h2>
          <p className="ingredients__desc maxwidth">
            We vet every brand, every formula, so you don&apos;t have to.
          </p>
        </div>
        <div ref={wrapperRef} className="ingredients__wrapper">
          <div className="ingredients__bgmobile event-none" />
          <div
            className="ingredients__image-1 d-none d-md-block parallax-scroll"
            data-parallax
            data-parallax-speed="0.14"
          >
            <Image src="/images/leaf.png" alt="Leaf" width={272} height={380} style={{ width: "100%", height: "auto" }} />
          </div>
          <div
            className="ingredients__image-2 d-none d-md-block parallax-scroll"
            data-parallax
            data-parallax-speed="0.14"
          >
            <Image src="/images/empress.png" alt="Empress" width={272} height={380} style={{ width: "100%", height: "auto" }} />
          </div>
          <div
            className="ingredients__image-wrapper parallax-scroll"
            data-parallax
            data-parallax-speed="-0.035"
          >
            <Image src="/images/ingredients-clip.jpg" alt="Ingredients" fill sizes="70vw" style={{ objectFit: "cover" }} className="ingredients__image" />
          </div>
          <div className="ingredients__firstrow">
            <IngredientItem {...INGREDIENTS[0]} speed={0.09} />
            <IngredientItem {...INGREDIENTS[1]} speed={0.06} />
          </div>
          <div className="ingredients__secondrow">
            <IngredientItem {...INGREDIENTS[2]} speed={0.12} />
            <IngredientItem {...INGREDIENTS[3]} speed={0.09} />
          </div>
        </div>
      </div>
    </section>
  );
}
