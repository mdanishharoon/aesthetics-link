"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function Hero() {
  const videoMobileRef = useRef<HTMLVideoElement>(null);
  const videoDesktopRef = useRef<HTMLVideoElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mobile = videoMobileRef.current;
    const desktop = videoDesktopRef.current;
    if (mobile) void mobile.play().catch(() => {});
    if (desktop) void desktop.play().catch(() => {});
  }, []);

  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const offset = scrollY * 0.3;
        el.style.transform = `translateY(${offset}px)`;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="intro">
      <div className="intro__text">
        <div className="intro__title text-center text-none reveal-up is-visible hero-title-reveal">
          <h1>
            <span className="font-serif">True</span> to Oneself <br />
            kind to <span className="font-serif">Nature</span>
          </h1>
        </div>
        <p className="intro__desc maxwidth text-center reveal-up is-visible hero-copy-reveal">
          Unreservedly honest products that truly work, be kind to skin and the
          planet - no exceptions!
        </p>
      </div>
      <div className="intro__image">
        <div className="overlay-black" />
        <div className="parallax" ref={parallaxRef}>
          <div className="media-video parallax-image mobile">
            <video
              ref={videoMobileRef}
              loop
              muted
              playsInline
              preload="metadata"
              poster="/images/hero-poster-m.jpg"
            >
              <source src="/videos/hero-m.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="media-video parallax-image desktop">
            <video
              ref={videoDesktopRef}
              loop
              muted
              playsInline
              preload="metadata"
              poster="/images/hero-poster.jpg"
            >
              <source src="/videos/hero.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </div>
      <Link href="/products" className="intro__cta reveal-up is-visible hero-cta-reveal">
        <div className="masking-text">
          <p className="text text-uppercase">Explore All Products</p>
        </div>
        <div className="intro__cta-arrow">
          <svg
            className="icon-arrow"
            width="13"
            height="8"
            viewBox="0 0 13 8"
            fill="none"
          >
            <path
              d="M12.3536 4.35355C12.5488 4.15829 12.5488 3.84171 12.3536 3.64645L9.17157 0.464466C8.97631 0.269204 8.65973 0.269204 8.46447 0.464466C8.2692 0.659728 8.2692 0.976311 8.46447 1.17157L11.2929 4L8.46447 6.82843C8.2692 7.02369 8.2692 7.34027 8.46447 7.53553C8.65973 7.7308 8.97631 7.7308 9.17157 7.53553L12.3536 4.35355ZM0 4.5H12V3.5H0V4.5Z"
              fill="white"
            />
          </svg>
        </div>
      </Link>
    </section>
  );
}
