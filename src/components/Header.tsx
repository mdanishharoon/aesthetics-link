"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AestheticsLinkWordmark from "@/components/AestheticsLinkWordmark";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = 0;

    const onScroll = () => {
      const currentY = window.scrollY;

      setScrolled(currentY > 50);
      setHidden(currentY > 140 && currentY > lastY && !menuOpen);

      lastY = currentY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header
      id="header"
      className={`is--white${scrolled ? " scrolled active" : ""}${hidden ? " is--hidden" : ""}`}
    >
      <div className="container">
        <nav className={`navbar${menuOpen ? " active" : ""}`}>
          <div
            className={`navbar-hamburger${menuOpen ? " active" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            role="button"
          >
            <div className="navbar-hamburger-line navbar-hamburger-line-1" />
            <div className="navbar-hamburger-line navbar-hamburger-line-2" />
          </div>

          <Link href="/" className="navbar-logo" aria-label="AestheticsLink home">
            <AestheticsLinkWordmark className="navbar-logo__wordmark" />
          </Link>

          <div className={`navbar-menu${menuOpen ? " open" : ""}`}>
            <ul className="navbar-menu-list">
              <li className="navbar-menu-list-item">
                <Link
                  href="/products"
                  className="navbar-link-text link"
                  onClick={() => setMenuOpen(false)}
                >
                  Shop
                </Link>
              </li>
              <li className="navbar-menu-list-item">
                <Link
                  href="/philosophy"
                  className="navbar-link-text link"
                  onClick={() => setMenuOpen(false)}
                >
                  Philosophy
                </Link>
              </li>
              <li className="navbar-menu-list-item">
                <Link
                  href="/gallery"
                  className="navbar-link-text link"
                  onClick={() => setMenuOpen(false)}
                >
                  Gallery
                </Link>
              </li>
              <li className="navbar-menu-list-item">
                <Link
                  href="/journal"
                  className="navbar-link-text link"
                  onClick={() => setMenuOpen(false)}
                >
                  Journal
                </Link>
              </li>
            </ul>
            <div className="navbar-menu-foot d-md-none">
              <p>Stay linked to the latest in aesthetic science and new launches.</p>
            </div>
          </div>

          <div className="navbar-cta">
            <ul className="navbar-menu-list">
              <li className="navbar-menu-list-item">
                <button
                  id="cart-nav"
                  type="button"
                  className="navbar-menu-list-item-link"
                  aria-label="Cart"
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    color: "inherit",
                  }}
                >
                  <svg
                    className="icon-cart"
                    width="15"
                    height="18"
                    viewBox="0 0 15 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M1.19891 5.8049C1.2448 5.02484 1.89076 4.41576 2.67216 4.41576H12.0298C12.8112 4.41576 13.4572 5.02485 13.5031 5.8049L14.0884 15.7547C14.1382 16.6023 13.4643 17.3171 12.6151 17.3171H2.08688C1.23775 17.3171 0.563767 16.6023 0.61363 15.7547L1.19891 5.8049Z"
                      stroke="currentColor"
                      strokeWidth="0.983866"
                    />
                    <path
                      d="M11.4354 6.3737C11.4354 3.21604 9.60694 0.65625 7.35147 0.65625C5.096 0.65625 3.26758 3.21604 3.26758 6.3737"
                      stroke="currentColor"
                      strokeWidth="0.983866"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </li>
              <div className="border-vertical d-none d-md-block" />
              <li className="navbar-menu-list-item d-none d-md-block">
                <Link
                  href="/login"
                  className="navbar-menu-list-item-link"
                  aria-label="Login"
                >
                  <svg
                    className="icon-account"
                    width="16"
                    height="18"
                    viewBox="0 0 16 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.024 17.0559V15.3068C15.024 14.379 14.6555 13.4892 13.9994 12.8332C13.3434 12.1772 12.4536 11.8086 11.5258 11.8086H4.52944C3.60166 11.8086 2.71188 12.1772 2.05585 12.8332C1.39981 13.4892 1.03125 14.379 1.03125 15.3068V17.0559"
                      stroke="currentColor"
                      strokeWidth="0.983866"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.02798 8.30986C9.95997 8.30986 11.5262 6.74367 11.5262 4.81167C11.5262 2.87967 9.95997 1.31348 8.02798 1.31348C6.09598 1.31348 4.52979 2.87967 4.52979 4.81167C4.52979 6.74367 6.09598 8.30986 8.02798 8.30986Z"
                      stroke="currentColor"
                      strokeWidth="0.983866"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
}
