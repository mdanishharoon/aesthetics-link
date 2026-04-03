"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useParallax<T extends HTMLElement>(
  speed: number = 0.15
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.innerWidth < 768
    ) {
      el.style.setProperty("--parallax-y", "0px");
      return;
    }

    let ticking = false;

    const update = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const windowH = window.innerHeight;
        if (rect.bottom > 0 && rect.top < windowH) {
          const center = rect.top + rect.height / 2;
          const offset = (center - windowH / 2) * speed;
          el.style.setProperty("--parallax-y", `${offset}px`);
        }
        ticking = false;
      });
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [speed]);

  return ref;
}

export function useParallaxMultiple(
  containerRef: RefObject<HTMLElement | null>,
  selector: string = "[data-parallax]",
  defaultSpeed: number = 0.15
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.innerWidth < 768
    ) {
      const elements = container.querySelectorAll<HTMLElement>(selector);
      elements.forEach((el) => el.style.setProperty("--parallax-y", "0px"));
      return;
    }

    let ticking = false;
    const elements = container.querySelectorAll<HTMLElement>(selector);

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const windowH = window.innerHeight;
        elements.forEach((el) => {
          const speed =
            parseFloat(el.dataset.parallaxSpeed || "") || defaultSpeed;
          const rect = el.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < windowH) {
            const center = rect.top + rect.height / 2;
            const offset = (center - windowH / 2) * speed;
            el.style.setProperty("--parallax-y", `${offset}px`);
          }
        });
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [containerRef, selector, defaultSpeed]);
}
