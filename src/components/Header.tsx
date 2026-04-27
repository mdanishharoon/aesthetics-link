"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AestheticsLinkWordmark from "@/components/AestheticsLinkWordmark";
import { useAuth } from "@/components/AuthProvider";
import { useStorefrontNavigation } from "@/components/StorefrontNavigationProvider";
import { DEFAULT_NAVIGATION } from "@/lib/storefront/constants";
import { fetchCart, getCachedCartSnapshot } from "@/lib/storefront/client";
import { decodeEntities } from "@/lib/utils/text";
import type { StorefrontCart } from "@/types";

export default function Header({ darkLogo = false, forceScrolled = false }: { darkLogo?: boolean; forceScrolled?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(forceScrolled);
  const [hidden, setHidden] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const navigation = useStorefrontNavigation() ?? DEFAULT_NAVIGATION;
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user } = useAuth();

  const [initialCachedCart] = useState<StorefrontCart | null>(() => getCachedCartSnapshot());
  const { data: cart } = useQuery<StorefrontCart>({
    queryKey: ["storefront", "cart"],
    queryFn: fetchCart,
    enabled: false,
    ...(initialCachedCart ? { initialData: initialCachedCart } : {}),
  });
  const cartCount = cart?.itemCount ?? 0;

  useEffect(() => {
    let lastY = 0;

    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(forceScrolled || currentY > 50);
      setHidden(currentY > 140 && currentY > lastY && !menuOpen);
      lastY = currentY;
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const openDropdown = (name: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setActiveDropdown(name);
  };

  const closeDropdown = () => {
    dropdownTimeout.current = setTimeout(() => setActiveDropdown(null), 120);
  };

  const toggleMobile = (name: string) => {
    setMobileExpanded((prev) => (prev === name ? null : name));
  };

  const closeAll = () => {
    setMenuOpen(false);
    setMobileExpanded(null);
    setActiveDropdown(null);
  };

  const formatNavLabel = (value: string): string => {
    return decodeEntities(value).replace(/\s+/g, " ").trim();
  };

  return (
    <header
      id="header"
      className={[
        "is--white",
        darkLogo ? "dark-logo" : "",
        scrolled ? "scrolled" : "",
        scrolled || menuOpen ? "active" : "",
        hidden ? "is--hidden" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="container">
        <nav className={`navbar${menuOpen ? " active" : ""}`} aria-label="Main navigation">
          <button
            type="button"
            className={`navbar-hamburger${menuOpen ? " active" : ""}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="navbar-mobile-menu"
          >
            <div className="navbar-hamburger-line navbar-hamburger-line-1" />
            <div className="navbar-hamburger-line navbar-hamburger-line-2" />
          </button>

          <Link href="/" className="navbar-logo" aria-label="AestheticsLink home">
            <AestheticsLinkWordmark className="navbar-logo__wordmark" />
          </Link>

          <div id="navbar-mobile-menu" className={`navbar-menu${menuOpen ? " open" : ""}`}>
            <ul className="navbar-menu-list">

              {/* Shop with dropdown */}
              <li
                className="navbar-menu-list-item navbar-menu-list-item--has-dropdown"
                onMouseEnter={() => openDropdown("shop")}
                onMouseLeave={closeDropdown}
              >
                <button
                  type="button"
                  className="navbar-link-text navbar-dropdown-trigger d-none d-md-flex"
                  aria-expanded={activeDropdown === "shop"}
                  aria-haspopup="true"
                  onClick={() => activeDropdown === "shop" ? setActiveDropdown(null) : openDropdown("shop")}
                >
                  Shop
                  <svg className="navbar-chevron" width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true">
                    <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {/* Mobile accordion trigger */}
                <button
                  type="button"
                  className="navbar-link-text navbar-dropdown-trigger d-md-none"
                  onClick={() => toggleMobile("shop")}
                  aria-expanded={mobileExpanded === "shop"}
                >
                  Shop
                  <span className={`navbar-accordion-icon${mobileExpanded === "shop" ? " is-open" : ""}`}>+</span>
                </button>

                {/* Desktop dropdown */}
                <div
                  className={`navbar-dropdown d-none d-md-block${activeDropdown === "shop" ? " is-open" : ""}`}
                  onMouseEnter={() => openDropdown("shop")}
                  onMouseLeave={closeDropdown}
                >
                  <div className="navbar-dropdown-col">
                    {navigation.top.map((link) => (
                      <Link key={link.href} href={link.href} className="navbar-dropdown-link" onClick={closeAll}>
                        {formatNavLabel(link.label)}
                      </Link>
                    ))}
                  </div>
                  <div className="navbar-dropdown-divider" />
                  <div className="navbar-dropdown-col">
                    <span className="navbar-dropdown-label superscript">By Target Area</span>
                    <div className="navbar-dropdown-concerns">
                      {navigation.concerns.map((link) => (
                        <Link key={link.href} href={link.href} className="navbar-dropdown-link navbar-dropdown-link--sm" onClick={closeAll}>
                          {formatNavLabel(link.label)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile accordion */}
                <div className={`navbar-accordion-panel d-md-none${mobileExpanded === "shop" ? " is-open" : ""}`}>
                  <div className="navbar-accordion-inner">
                    {navigation.top.map((link) => (
                      <Link key={link.href} href={link.href} className="navbar-accordion-link" onClick={closeAll}>
                        {formatNavLabel(link.label)}
                      </Link>
                    ))}
                    <span className="navbar-accordion-sublabel superscript">By Target Area</span>
                    {navigation.concerns.map((link) => (
                      <Link key={link.href} href={link.href} className="navbar-accordion-link navbar-accordion-link--sm" onClick={closeAll}>
                        {formatNavLabel(link.label)}
                      </Link>
                    ))}
                  </div>
                </div>
              </li>

              {/* Brands with dropdown */}
              <li
                className="navbar-menu-list-item navbar-menu-list-item--has-dropdown"
                onMouseEnter={() => openDropdown("brands")}
                onMouseLeave={closeDropdown}
              >
                <button
                  type="button"
                  className="navbar-link-text navbar-dropdown-trigger d-none d-md-flex"
                  aria-expanded={activeDropdown === "brands"}
                  aria-haspopup="true"
                  onClick={() => activeDropdown === "brands" ? setActiveDropdown(null) : openDropdown("brands")}
                >
                  Brands
                  <svg className="navbar-chevron" width="8" height="5" viewBox="0 0 8 5" fill="none" aria-hidden="true">
                    <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="navbar-link-text navbar-dropdown-trigger d-md-none"
                  onClick={() => toggleMobile("brands")}
                  aria-expanded={mobileExpanded === "brands"}
                >
                  Brands
                  <span className={`navbar-accordion-icon${mobileExpanded === "brands" ? " is-open" : ""}`}>+</span>
                </button>

                {/* Desktop dropdown */}
                <div
                  className={`navbar-dropdown d-none d-md-block${activeDropdown === "brands" ? " is-open" : ""}`}
                  onMouseEnter={() => openDropdown("brands")}
                  onMouseLeave={closeDropdown}
                >
                  <div className="navbar-dropdown-col">
                    {navigation.brands.map((link) => (
                      <Link key={link.href} href={link.href} className="navbar-dropdown-link" onClick={closeAll}>
                        {formatNavLabel(link.label)}
                      </Link>
                    ))}
                    <div className="navbar-dropdown-divider" />
                    <Link href="/products" className="navbar-dropdown-link navbar-dropdown-link--view-all" onClick={closeAll}>
                      View All Brands →
                    </Link>
                  </div>
                </div>

                {/* Mobile accordion */}
                <div className={`navbar-accordion-panel d-md-none${mobileExpanded === "brands" ? " is-open" : ""}`}>
                  <div className="navbar-accordion-inner">
                    {navigation.brands.map((link) => (
                      <Link key={link.href} href={link.href} className="navbar-accordion-link" onClick={closeAll}>
                        {formatNavLabel(link.label)}
                      </Link>
                    ))}
                    <Link href="/products" className="navbar-accordion-link navbar-accordion-link--sm" onClick={closeAll}>
                      View All Brands
                    </Link>
                  </div>
                </div>
              </li>


              <li className="navbar-menu-list-item navbar-menu-list-item--mobile-account">
                <Link
                  href="/profile"
                  className="navbar-link-text link"
                  onClick={closeAll}
                >
                  Account
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
                <Link
                  href="/cart"
                  id="cart-nav"
                  className="navbar-menu-list-item-link"
                  aria-label={cartCount > 0 ? `Cart (${cartCount})` : "Cart"}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    color: "inherit",
                    position: "relative",
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
                  {cartCount > 0 ? (
                    <span
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-8px",
                        minWidth: "16px",
                        height: "16px",
                        borderRadius: "8px",
                        background: "var(--color-text, #111)",
                        color: "var(--color-bg, #fff)",
                        fontSize: "10px",
                        fontWeight: 600,
                        lineHeight: "16px",
                        textAlign: "center",
                        padding: "0 3px",
                        pointerEvents: "none",
                      }}
                      aria-hidden="true"
                    >
                      {cartCount}
                    </span>
                  ) : null}
                </Link>
              </li>
              <li role="separator" aria-hidden="true" className="border-vertical d-none d-md-block" />
              <li className="navbar-menu-list-item navbar-cta-account">
                <Link
                  href="/profile"
                  className="navbar-menu-list-item-link"
                  aria-label="My account"
                  style={{ position: "relative" }}
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
                  {user ? (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "-2px",
                        right: "-4px",
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "#4caf50",
                        border: "1.5px solid var(--color-bg, #fff)",
                        pointerEvents: "none",
                      }}
                      aria-hidden="true"
                    />
                  ) : null}
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
}
