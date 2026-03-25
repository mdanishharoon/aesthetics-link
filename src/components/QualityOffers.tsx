"use client";

import Link from "next/link";
import { useParallax } from "@/hooks/useParallax";

function ArrowLongIcon() {
  return (
    <svg className="icon-arrowlong" width="19" height="19" viewBox="0 0 19 19" fill="none">
      <path d="M18.7425 0.726739C18.7425 0.467333 18.5322 0.257042 18.2728 0.257042L14.0455 0.257042C13.7861 0.257042 13.5758 0.467333 13.5758 0.72674C13.5758 0.986147 13.7861 1.19644 14.0455 1.19644L17.8031 1.19644L17.8031 4.95401C17.8031 5.21342 18.0134 5.42371 18.2728 5.42371C18.5322 5.42371 18.7425 5.21342 18.7425 4.95401L18.7425 0.726739ZM0.786716 18.877L18.6049 1.05887L17.9406 0.394614L0.122464 18.2128L0.786716 18.877Z" fill="white" />
    </svg>
  );
}

export default function QualityOffers() {
  const offerImgRef = useParallax<HTMLImageElement>(0.12);

  return (
    <section id="quiz" className="reveal-up" data-reveal>
      <div className="half__grid half__grid-1">
        <div className="half__grid-content">
          <svg
            width="639"
            height="384"
            viewBox="0 0 639 384"
            fill="none"
            className="quiz__arrow-svg"
          >
            <path
              d="M638.076 321.851C638.377 321.9 638.58 322.184 638.531 322.485L637.721 327.385C637.672 327.685 637.388 327.889 637.087 327.839C636.786 327.79 636.583 327.506 636.632 327.205L637.352 322.849L632.996 322.13C632.696 322.08 632.492 321.796 632.542 321.496C632.592 321.195 632.876 320.992 633.176 321.041L638.076 321.851ZM-87.3542 0.407563C-107.563 75.761 -86.4598 143.569 -39.8796 200.418C6.71312 257.283 78.7928 303.173 160.472 334.605C242.146 366.035 333.378 382.993 418.236 382.025C503.101 381.058 581.536 362.162 637.665 321.946L638.308 322.844C581.929 363.238 503.244 382.16 418.248 383.129C333.245 384.098 241.874 367.113 160.076 335.635C78.2819 304.159 6.01781 258.176 -40.7333 201.118C-87.497 144.044 -108.737 75.8778 -88.4201 0.121688L-87.3542 0.407563Z"
              fill="#353535"
            />
          </svg>
          <div className="media-img quiz__product-img">
            <img alt="Product" src="/images/texture.png" />
          </div>
          <div className="half__grid-text">
            <div className="pill">QUALITY</div>
            <h3 className="half__grid-title">
              Only proven Ingredients, quality over quantity always!
            </h3>
            <p className="text-gray2">
              Its about what we don&apos;t put in. Squeaky clean formulas with over
              1500 Negative Ingredients.
            </p>
          </div>
        </div>
        <div className="half__grid-img parallax">
          <div className="offer__text">
            <h3 className="title font-heading">
              Exciting <br />
              offers <i>awaits</i>
            </h3>
            <p className="description">
              Shop now to get a chance to win 2 extra products. Grab the offer
              before it ends.
            </p>
          </div>
          <div className="offer__cta">
            <Link href="/products" className="offer__more">
              <div className="arrowlong">
                <ArrowLongIcon />
              </div>
              <span className="text-underline text-uppercase">Shop Now</span>
            </Link>
          </div>
          <div className="media-img parallax-image">
            <img
              ref={offerImgRef}
              alt="Offer"
              src="/images/offer.jpg"
              className="parallax-image-asset"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
