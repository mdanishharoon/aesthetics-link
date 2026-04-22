"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";

export default function About() {
  return (
    <div className="about-page">
      <MotionProvider />
      <Header darkLogo />

      <main>
        {/* ── 1. HERO ──────────────────────────────────────────────── */}
        <section className="about-hero">
          <div className="about-hero__copy">
            <span className="superscript about-eyebrow">About AestheticsLink</span>
            <h1 className="about-hero__h1">
              <span className="about-hero__h1-lead">Where Science<br />Meets</span>
              <em className="about-hero__h1-em">Skin.</em>
            </h1>
          </div>
          <div className="about-hero__media">
            <Image
              src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=1200&q=85"
              alt="AestheticsLink — skincare crafted with precision"
              fill
              sizes="(max-width: 767px) 100vw, 60vw"
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </section>

        {/* ── 2. FOUNDING PRINCIPLE ────────────────────────────────── */}
        <section className="about-quote reveal-up" data-reveal>
          <div className="container">
            <blockquote className="about-quote__text">
              We strip away the superfluous — engineering skincare that honours
              clinical rigour as deeply as it honours physical beauty.
            </blockquote>
            <p className="about-quote__attr">— The Founding Principle</p>
          </div>
        </section>

        {/* ── 3. PHILOSOPHY ────────────────────────────────────────── */}
        <section className="about-feature reveal-up" data-reveal>
          <div className="container">
            <div className="about-feature__grid">
              <div className="about-feature__text">
                <span className="superscript about-eyebrow">Our Belief</span>
                <h2 className="about-feature__heading">
                  Driven by science.<br />
                  <em>Refined by aesthetics.</em>
                </h2>
                <div className="about-feature__body">
                  <p>
                    AestheticsLink was founded on a singular conviction: skincare should never ask you
                    to compromise. We pair profound scientific rigour with an unwavering commitment to
                    beauty — formulations that perform at the highest clinical standards without
                    sacrificing sensory elegance.
                  </p>
                  <p>
                    We regard the skin as an intricate living ecosystem, not a surface to be treated.
                    Every ingredient is present because the skin recognises it, utilises it, and
                    genuinely benefits from it.
                  </p>
                  <p>
                    We partner with leading chemists and dermatologists to verify efficacy at every
                    stage, from concept through to final formula and stability testing.
                  </p>
                </div>
              </div>
              <div className="about-feature__image">
                <Image
                  src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900&q=85"
                  alt="The AestheticsLink formulation process"
                  fill
                  sizes="(max-width: 767px) 100vw, 42vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. THE MANDATE ───────────────────────────────────────── */}
        <section className="about-pillars reveal-up" data-reveal>
          <div className="container">
            <div className="about-pillars__head">
              <span className="superscript about-eyebrow">Our Pillars</span>
              <h2 className="about-pillars__heading">
                The AestheticsLink<br /><em>Mandate.</em>
              </h2>
            </div>
            <ol className="about-pillars__list">
              {[
                {
                  num: "01",
                  title: "Absolute Purity",
                  body: "We rigorously exclude sensitising additives, silicones, and synthetic fragrances. Our formulas contain only what the skin genuinely requires — nothing superfluous, nothing compromised.",
                },
                {
                  num: "02",
                  title: "Clinical Efficacy",
                  body: "Active ingredients are dosed precisely to their clinically proven percentages. No fairy dusting. No inflated claims. Only measurable, radical results you can see and feel.",
                },
                {
                  num: "03",
                  title: "Sensory Design",
                  body: "Texture and application are as vital as chemistry. We engineer our skincare to embody true physical luxury — a considered ritual, not a routine obligation.",
                },
              ].map((p) => (
                <li key={p.num} className="about-pillar">
                  <span className="about-pillar__num">{p.num}</span>
                  <h3 className="about-pillar__name">{p.title}</h3>
                  <p className="about-pillar__body">{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 5. CLOSING CTA ───────────────────────────────────────── */}
        <section className="about-close reveal-up" data-reveal>
          <div className="container">
            <span className="superscript about-eyebrow">Discover the range</span>
            <h2 className="about-close__heading">
              Skin that earns<br /><em>its confidence.</em>
            </h2>
            <Link href="/products" className="btn">Explore all products</Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
