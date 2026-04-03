"use client";

import { useRef } from "react";
import { useParallaxMultiple } from "@/hooks/useParallax";

const INGREDIENTS = [
  {
    icon: "/images/icon-clean-beyond-reproach.svg",
    title: "Clinically Validated",
    desc: "Every formula is backed by dermal science and verified actives — free from over 1800 questionable compounds. Because precision starts with the right ingredients.",
  },
  {
    icon: "/images/icon-radical-transparency.svg",
    title: "Full Transparency",
    desc: "No hidden ingredients, no guesswork. We disclose our complete formulas so you always know exactly what you're applying and at what concentration.",
  },
  {
    icon: "/images/icon-potent-multi-tasking.svg",
    title: "Potent & Targeted",
    desc: "Our actives, antioxidants and skin-restoring compounds are precisely dosed and backed by dermal science to deliver visible, measurable results.",
  },
  {
    icon: "/images/icon-conscious-responsible.svg",
    title: "Responsible Beauty",
    desc: "PETA Certified Vegan and Cruelty Free. Our formulas are always housed in responsible packaging and produced with sustainability at the core.",
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
        <img alt={title} src={icon} />
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
            Science-Led, Results-Driven,{" "}
            <span className="ingredients__title-serif font-serif text-underline-border">
              Precision.
            </span>
          </h2>
          <p className="ingredients__desc maxwidth">
            Precision-engineered formulas that truly transform, backed by science
            and designed without compromise.
          </p>
        </div>
        <div ref={wrapperRef} className="ingredients__wrapper">
          <div className="ingredients__bgmobile event-none" />
          <div
            className="ingredients__image-1 d-none d-md-block parallax-scroll"
            data-parallax
            data-parallax-speed="0.14"
          >
            <img alt="Leaf" src="/images/leaf.png" />
          </div>
          <div
            className="ingredients__image-2 d-none d-md-block parallax-scroll"
            data-parallax
            data-parallax-speed="0.14"
          >
            <img alt="Empress" src="/images/empress.png" />
          </div>
          <div
            className="ingredients__image-wrapper parallax-scroll"
            data-parallax
            data-parallax-speed="-0.035"
          >
            <img
              alt="Ingredients"
              src="/images/ingredients-clip.jpg"
              className="ingredients__image"
            />
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
