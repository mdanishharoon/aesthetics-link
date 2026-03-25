"use client";

import Link from "next/link";
import { useParallax } from "@/hooks/useParallax";

export default function Ethos() {
  const textureRef = useParallax<HTMLImageElement>(0.2);

  return (
    <section id="ethos" className="reveal-up" data-reveal>
      <div className="container">
        <span className="pill mb-4 d-md-none">Ethos</span>
        <div className="ethos__text">
          <h2 className="ethos__title d-none d-md-block">
            Radical <br /> Transparency. <br />
          </h2>
          <h2 className="ethos__title-2">
            <span className="font-serif text-uppercase">Hide</span> <br /> Nothing.
          </h2>
        </div>

        <div className="media-img ethos__image parallax-scroll">
          <img
            ref={textureRef}
            alt="Philosophy"
            src="/images/texture.png"
            className="parallax-image-asset"
          />
        </div>

        <div className="row d-flex d-md-none">
          <div className="col-2 mb-5">
            <img
              className="ethos__icon"
              alt="Transparent"
              src="/images/icon-highest-standards.svg"
            />
          </div>
          <div className="col-10 mb-5">
            <h3 className="font-serif font-normal font-subheading2 mb-3">
              100% Transparent <br /> Formulas
            </h3>
            <p>
              Highest Standards. <br />
              <span className="text-gray2">
                We formulate to the highest standards of efficacy and safety -
                using only proven, verified ingredients in bio-compatible bases;
                and free from over 1800 questionable ingredients
              </span>
            </p>
          </div>
          <div className="col-2">
            <img
              className="ethos__icon"
              alt="Verified"
              src="/images/icon-real-results.svg"
            />
          </div>
          <div className="col-10">
            <h3 className="font-serif font-normal font-subheading2 mb-3">
              Only Verified <br /> Ingredients
            </h3>
            <p>
              Real Results. <br />
              <span className="text-gray2">
                Skin care packed with anti oxidants, skin replenishing and skin
                restoring agents in stable pH levels that don&apos;t promise
                miracles, but deliver real results.
              </span>
            </p>
          </div>
        </div>

        <div className="row d-none d-md-flex mt-5">
          <div className="col-md-7 d-none d-md-block" />
          <div className="col-md-5">
            <div className="ethos__item">
              <div className="row">
                <div className="col-6 d-flex align-items-start">
                  <img
                    className="ethos__icon"
                    alt="Transparent"
                    src="/images/icon-highest-standards.svg"
                  />
                  <h3 className="font-serif font-normal">
                    100% Transparent <br /> Formulas
                  </h3>
                </div>
                <div className="col-6">
                  <p>
                    Highest Standards. <br />
                    <span className="text-gray2">
                      We formulate to the highest standards of efficacy and
                      safety - using only proven, verified ingredients in
                      bio-compatible bases; and free from over 1800 questionable
                      ingredients
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-7 d-none d-md-block" />
          <div className="col-md-5">
            <div className="ethos__item">
              <div className="row">
                <div className="col-6 d-flex align-items-start">
                  <img
                    className="ethos__icon"
                    alt="Verified"
                    src="/images/icon-real-results.svg"
                  />
                  <h3 className="font-serif font-normal">
                    Only Verified <br /> Ingredients
                  </h3>
                </div>
                <div className="col-6">
                  <p>
                    Real Results. <br />
                    <span className="text-gray2">
                      Skin care packed with anti oxidants, skin replenishing and
                      skin restoring agents in stable pH levels that don&apos;t
                      promise miracles, but deliver real results.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-2 d-block d-md-none" />
          <div className="col-10">
            <Link href="/philosophy" className="ethos__arrow">
              <div className="arrowlong">
                <svg
                  className="icon-arrowlong"
                  width="19"
                  height="19"
                  viewBox="0 0 19 19"
                  fill="none"
                >
                  <path
                    d="M18.7425 0.726739C18.7425 0.467333 18.5322 0.257042 18.2728 0.257042L14.0455 0.257042C13.7861 0.257042 13.5758 0.467333 13.5758 0.72674C13.5758 0.986147 13.7861 1.19644 14.0455 1.19644L17.8031 1.19644L17.8031 4.95401C17.8031 5.21342 18.0134 5.42371 18.2728 5.42371C18.5322 5.42371 18.7425 5.21342 18.7425 4.95401L18.7425 0.726739ZM0.786716 18.877L18.6049 1.05887L17.9406 0.394614L0.122464 18.2128L0.786716 18.877Z"
                    fill="white"
                  />
                </svg>
              </div>
              <p>
                Our <br /> Philosophy
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
