"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParallax } from "@/hooks/useParallax";
import AestheticsLinkWordmark from "@/components/AestheticsLinkWordmark";
import { useAuth } from "@/components/AuthProvider";
import { resolveMarketingCustomerType, resolveMarketingRegion } from "@/lib/marketing/context";

function ArrowLongIcon() {
  return (
    <svg className="icon-arrowlong" width="19" height="19" viewBox="0 0 19 19" fill="none">
      <path d="M18.7425 0.726739C18.7425 0.467333 18.5322 0.257042 18.2728 0.257042L14.0455 0.257042C13.7861 0.257042 13.5758 0.467333 13.5758 0.72674C13.5758 0.986147 13.7861 1.19644 14.0455 1.19644L17.8031 1.19644L17.8031 4.95401C17.8031 5.21342 18.0134 5.42371 18.2728 5.42371C18.5322 5.42371 18.7425 5.21342 18.7425 4.95401L18.7425 0.726739ZM0.786716 18.877L18.6049 1.05887L17.9406 0.394614L0.122464 18.2128L0.786716 18.877Z" fill="currentColor" />
    </svg>
  );
}

export default function Footer() {
  const footerImgRef = useParallax<HTMLImageElement>(0.1);
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const handleSubscribe = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus({ tone: "error", message: "Please enter a valid email address." });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          source: "footer",
          customerType: resolveMarketingCustomerType(user),
          region: resolveMarketingRegion(
            user,
            typeof navigator !== "undefined" ? navigator.language : "",
          ),
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to subscribe right now. Please try again.");
      }

      setStatus({
        tone: "success",
        message: payload?.message || "Subscribed. Please check your inbox for confirmation.",
      });
      setEmail("");
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to subscribe right now. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer id="footer" className="reveal-up" data-reveal>
      <div className="footer__parallax">
        <div className="wrapper">
          <div className="media-img desktop footer__parallax-image">
            <Image ref={footerImgRef} alt="Footer" src="/images/footer2.png" fill sizes="100vw" style={{ objectFit: "cover" }} className="parallax-image-asset" />
          </div>
          <div className="media-img mobile footer__parallax-image">
            <Image alt="Footer" src="/images/footer-m.jpg" fill sizes="100vw" style={{ objectFit: "cover" }} />
          </div>
        </div>
      </div>

      <div className="container">
        <div className="row footer__wrapper">
          <div className="col-md-5 order-2 order-md-1">
            <div className="row gx-0">
              <div className="col-md-4 col-6">
                <p className="subtitle text-gray2">Explore</p>
                <ul>
                  <li><Link href="/products" className="link">Shop</Link></li>
                  <li><Link href="/profile" className="link">Account</Link></li>
                </ul>
              </div>
              <div className="col-md-4 col-6">
                <p className="subtitle text-gray2">Follow Us</p>
                <ul>
<li>
                      <a href="https://www.instagram.com/aestheticslinkuk/" target="_blank" rel="noopener noreferrer" className="link">Instagram</a>
                    </li>
                    <li>
                      <a href="https://www.facebook.com/profile.php?id=61583653782861" target="_blank" rel="noopener noreferrer" className="link">Facebook</a>
                    </li>
                </ul>
              </div>
              <div className="col-md-4 col-12 mt-5 mt-md-0">
                <p className="subtitle text-gray2">Contact Us</p>
                <ul>
                  <li><a href="mailto:hello@aestheticslink.com" className="link">hello@aestheticslink.com</a></li>
                  <li><a href="tel:+111122223333" className="link">01614136032</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="col-md-2 d-none d-md-block order-md-2" />

          <div className="col-md-5 footer__email-wrapper order-1 order-md-2">
            <div className="footer__email">
              <h5 className="footer__email-title text-uppercase">
                Hear more <br /> from Us
              </h5>
              <p className="maxwidth-0 text-gray2">
                Stay linked to the latest in aesthetic science and new launches.
              </p>
              <form onSubmit={handleSubscribe}>
                <input
                  type="email"
                  name="contact[email]"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoComplete="email"
                  placeholder="Enter your email"
                  aria-label="Your email address"
                  required
                />
                <button className="btn btn--white" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Subscribe"}
                    <span className="btn-arrow">
                      <ArrowLongIcon />
                    </span>
                  </button>
              </form>
              {status ? (
                <p
                  className="font-small"
                  role="status"
                  aria-live="polite"
                  style={{ color: status.tone === "success" ? "#cde6cf" : "#ffd6d6", marginTop: "0.8rem" }}
                >
                  {status.message}
                </p>
              ) : null}
              <div className="border" />
              <p className="text-gray3 font-small maxwidth-0">
                No spam, only quality articles to help you look more radiant. You can opt out anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="footer__copyright">
          <Link
            href="/"
            className="footer__wordmark-link"
            aria-label="AestheticsLink home"
          >
            <AestheticsLinkWordmark className="footer__wordmark" />
          </Link>
          <p className="font-small">
            Aesthetic by Design. Precision formulas that truly transform.
          </p>
          <div className="footer__copyright-wrapper">
            <p className="footer__copyright-right mb-3 mb-md-0">
              &copy; 2026 AestheticsLink, All Rights Reserved
            </p>
            <ul className="footer__copyright-links">
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
