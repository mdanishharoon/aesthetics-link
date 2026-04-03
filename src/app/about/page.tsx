"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotionProvider from "@/components/MotionProvider";

export default function About() {
    return (
        <div className="about-page">
            <MotionProvider />
            <Header />

            <main>
                {/* ── HERO ────────────────────────────────────────────────── */}
                <section className="about-hero">
                    <div className="container" style={{ position: "relative", zIndex: 3 }}>
                        <h1 className="about-hero__title reveal-up" data-reveal>
                            The Standard of <br />
                            Radical Aesthetics.
                        </h1>
                        <p className="about-hero__subtitle reveal-up" data-reveal>
                            Honoring the biology of the skin.
                        </p>
                    </div>
                </section>

                {/* ── HUGE QUOTE ─────────────────────────────────────────── */}
                <section className="about-quote reveal-up" data-reveal>
                    <div className="container">
                        <h2 className="about-quote__text">
                            "We strip away the superfluous, engineering skincare that honors clinical rigor as deeply as it honors physical beauty."
                        </h2>
                    </div>
                </section>

                {/* ── MISSION ─────────────────────────────────────────────── */}
                <section className="about-mission reveal-up" data-reveal>
                    <div className="container">
                        <div className="about-mission__grid">
                            <div className="about-mission__image">
                                <img src="https://images.unsplash.com/photo-1615397323067-160dd80e2f5e?w=800&q=80" alt="AestheticsLink Philosophy" />
                            </div>
                            <div className="about-mission__content">
                                <h2 className="about-heading font-serif">
                                    Driven by science. <br />
                                    Refined by aesthetics.
                                </h2>
                                <p className="about-text">
                                    AestheticsLink was founded on a singular principle: skincare should not be a series of compromises. We pair profound scientific rigor with an unwavering commitment to beauty, creating formulations that perform at the highest clinical standards without sacrificing sensory elegance.
                                </p>
                                <p className="about-text">
                                    We look at the skin as an intricate ecosystem. Rather than stripping it, we supply it with biocompatible active ingredients that its cellular structure naturally recognizes and utilizes.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── THE LABORATORY (Dark) ──────────────────────────────── */}
                <section className="about-dark-section reveal-up" data-reveal>
                    <div className="container">
                        <div style={{ maxWidth: "48rem" }}>
                            <span className="superscript" style={{ marginBottom: "1.5rem", display: "inline-block", color: "#888" }}>
                                The Laboratory
                            </span>
                            <h2 className="about-heading font-serif">
                                Engineering without compromise.
                            </h2>
                            <p className="about-text" style={{ fontSize: "1.2rem", maxWidth: "36rem" }}>
                                Our proprietary formulation process takes place in state-of-the-art facilities, focusing heavily on ingredient biocompatibility, molecular weight delivery, and sensory feel. Every product represents years of clinical iteration.
                            </p>
                        </div>

                        <div className="about-image-collage mt-4">
                            <div className="about-image-wide">
                                <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1200&q=80" alt="Lab Texture" />
                            </div>
                            <div className="about-image-tall">
                                <img src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80" alt="Clinical Precision" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── VALUES (Heavy Typographic) ─────────────────────────── */}
                <section className="about-values reveal-up" data-reveal>
                    <div className="container">
                        <div style={{ marginBottom: "3rem" }}>
                            <span className="superscript" style={{ marginBottom: "1rem", display: "inline-block" }}>Our Pillars</span>
                            <h2 className="about-heading font-serif" style={{ fontSize: "3.5rem" }}>
                                The TrueKind Mandate.
                            </h2>
                        </div>

                        <div className="about-values__grid">
                            <div className="about-value-card">
                                <span className="about-value-number">01</span>
                                <h3>Absolute Purity</h3>
                                <p>
                                    We rigorously exclude sensitizing additives, silicones, and synthetic fragrances to ensure our formulas only provide what the skin genuinely requires.
                                </p>
                            </div>
                            <div className="about-value-card">
                                <span className="about-value-number">02</span>
                                <h3>Clinical Efficacy</h3>
                                <p>
                                    Our active ingredients are dosed precisely to their clinically proven percentages. No fairy dusting. Only radical, measurable results.
                                </p>
                            </div>
                            <div className="about-value-card">
                                <span className="about-value-number">03</span>
                                <h3>Sensory Design</h3>
                                <p>
                                    Because a product's texture and application are just as vital as its chemistry, we engineer our skincare to embody true physical luxury.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
