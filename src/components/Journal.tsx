import Image from "next/image";
import Link from "next/link";

export default function Journal() {
  return (
    <section id="journal" className="reveal-up" data-reveal>
      <div className="container">
        {/* Mobile-only title */}
        <div className="d-block d-md-none text-center mb-5">
          <h2 className="journal__title">
            <span className="font-serif">curated</span> <br /> Insights
          </h2>
          <p className="maxwidth text-center">
            Evidence-based guidance on skin, treatments, and radiant living.
          </p>
        </div>

        <div className="row gx-0 gy-5 gy-md-0">
          {/* Featured card (left col) */}
          <div className="col-md-6 pe-0 pe-md-5">
            <div className="journal__card featured">
              <Link
                href="/journal/evidence-led-skincare-what-moves-the-needle"
                className="article-card"
              >
                <div className="journal__card-image">
                  <span className="ribbon">Featured</span>
                  <Image alt="Evidence-led skincare article" src="/images/journal-featured.jpg" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: "cover" }} />
                </div>
                <div className="journal__card-text">
                  <h3 className="journal__card-title">
                    Evidence-Led Skincare: What Actually Moves the Needle
                  </h3>
                  <p className="journal__card-desc">
                    From our UK formulation lab to your bathroom shelf, we pair
                    dermal science with full formula transparency: effective,
                    considered care that respects your skin and the environment.
                  </p>
                  <div className="journal__card-detail">
                    <span className="font-small text-gray2">8 Feb 2025</span>
                    <span className="font-small text-uppercase">Read more</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Right col: desktop title + two smaller cards */}
          <div className="col-md-6">
            {/* Desktop-only title */}
            <div className="d-none d-md-block journal__desktop-head">
              <h2 className="journal__title">
                <span className="font-serif">curated</span> <br /> Insights
              </h2>
              <p className="journal__desc">
                Evidence-based guidance on skin, treatments, and radiant living.
              </p>
            </div>

            <div className="journal__card">
              <Link href="/journal/your-skincare-and-makeup-routine-impacts-your-well-being">
                <div className="journal__card-image">
                  <Image alt="Skincare Routine" src="/images/journal-2.jpg" fill sizes="50vw" style={{ objectFit: "cover" }} />
                </div>
                <div className="journal__card-text">
                  <h3 className="journal__card-title">
                    Your Skincare and Makeup Routine Impacts Your Well-Being
                  </h3>
                  <div className="journal__card-detail">
                    <span className="font-small text-gray2">20 Dec 2024</span>
                    <span className="font-small text-uppercase">Read more</span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="journal__card">
              <Link href="/journal/how-to-make-your-routine-more-eco-friendly">
                <div className="journal__card-image">
                  <Image alt="Eco-Friendly Routine" src="/images/journal-3.jpg" fill sizes="50vw" style={{ objectFit: "cover" }} />
                </div>
                <div className="journal__card-text">
                  <h3 className="journal__card-title">
                    How to Make Your Routine More Eco-Friendly
                  </h3>
                  <div className="journal__card-detail">
                    <span className="font-small text-gray2">25 Jan 2025</span>
                    <span className="font-small text-uppercase">Read more</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-center mt-5">
          <Link href="/journal" className="journal__more">
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
            <p>See all</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
