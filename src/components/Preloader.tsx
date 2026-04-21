"use client";

import { useEffect, useState } from "react";
import AestheticsLinkWordmark from "@/components/AestheticsLinkWordmark";

export default function Preloader() {
  const [progress, setProgress] = useState(0);
  const [className, setClassName] = useState("preloader preloader--simple");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const duration = 1600;
    const start = performance.now();
    let frameId = 0;

    const animate = (time: number) => {
      const elapsed = time - start;
      const next = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(next);

      if (elapsed < duration) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);

    const t1 = setTimeout(() => {
      setClassName("preloader preloader--simple show-logo");
    }, 250);
    const t2 = setTimeout(() => {
      setClassName("preloader preloader--simple show-logo done");
    }, 1800);
    const t3 = setTimeout(() => {
      setHidden(true);
    }, 2350);

    return () => {
      window.cancelAnimationFrame(frameId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      className={className}
      style={{ display: hidden ? "none" : undefined }}
      aria-hidden="true"
    >
      <div className="bg">
        <div className="bg__left" />
        <div className="bg__right" />
      </div>
      <div className="preloader__inner">
        <div className="preloader-simple">
          <div className="text">
            <div className="number-wrapper">
              <span className="number">{String(progress).padStart(2, "0")}</span>
            </div>
          </div>
          <div className="line" />
          <div className="logo" aria-hidden="true">
            <AestheticsLinkWordmark className="preloader__word" />
          </div>
          <div className="loading">
            <div className="spinner" />
          </div>
        </div>
      </div>
    </div>
  );
}
