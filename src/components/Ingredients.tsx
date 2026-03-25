"use client";

import { useRef } from "react";
import { useParallaxMultiple } from "@/hooks/useParallax";

const INGREDIENTS = [
  {
    icon: "/images/icon-clean-beyond-reproach.svg",
    title: "Clean, Beyond Reproach",
    desc: "Truly clean with only verified ingredients; and free from over 1800 questionable ingredients. Because what you put on your skin matters.",
  },
  {
    icon: "/images/icon-radical-transparency.svg",
    title: "Radical Transparency",
    desc: "No black boxes, nothing to hide, we disclose our full formulas, so you will never have to guess what's in it and how much.",
  },
  {
    icon: "/images/icon-potent-multi-tasking.svg",
    title: "Potent & Multi Tasking",
    desc: "Our formulas are chock-a-block with actives, anti oxidants, skin restoring agents backed by dermal science that aim to deliver real results.",
  },
  {
    icon: "/images/icon-conscious-responsible.svg",
    title: "Conscious & Responsible",
    desc: "Peta Certified Vegan and Cruelty Free. Our products are always housed in responsible packaging and made sustainably.",
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
            Clean, Conscious, <br /> Performance{" "}
            <span className="ingredients__title-serif font-serif text-underline-border">
              skincare.
            </span>
          </h2>
          <p className="ingredients__desc maxwidth">
            Unreservedly honest products that truly work, be kind to skin and
            the planet - no exceptions!
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
