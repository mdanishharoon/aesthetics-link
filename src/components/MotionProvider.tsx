"use client";

import { useEffect } from "react";

export default function MotionProvider() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    const observed = new WeakSet<Element>();

    const observeRevealElement = (element: Element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }

      if (observed.has(element)) {
        return;
      }

      observed.add(element);
      observer.observe(element);
    };

    const observeWithin = (root: ParentNode) => {
      if (root instanceof Element && root.matches("[data-reveal]")) {
        observeRevealElement(root);
      }

      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((element) => {
        observeRevealElement(element);
      });
    };

    observeWithin(document);

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) {
            return;
          }
          observeWithin(node);
        });
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
