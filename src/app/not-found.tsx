"use client";

import Link from "next/link";
import { useEffect } from "react";

function NotFoundIcon() {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="not-found-icon"
    >
      <circle cx="60" cy="60" r="58" stroke="currentColor" strokeWidth="1" />
      <path
        d="M40 90V35C40 32.7909 41.7909 31 44 31H76C78.2091 31 80 32.7909 80 35V90"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M55 31V26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M60 60C60 55.5817 63.5817 52 68 52H52C47.4183 52 44 55.5817 44 60C44 64.4183 47.4183 68 52 68H68C72.4183 68 76 71.5817 76 76"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="60" cy="78" r="3" fill="currentColor" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
      <path d="M18.7425 0.726739C18.7425 0.467333 18.5322 0.257042 18.2728 0.257042L14.0455 0.257042C13.7861 0.257042 13.5758 0.467333 13.5758 0.72674C13.5758 0.986147 13.7861 1.19644 14.0455 1.19644L17.8031 1.19644L17.8031 4.95401C17.8031 5.21342 18.0134 5.42371 18.2728 5.42371C18.5322 5.42371 18.7425 5.21342 18.7425 4.95401L18.7425 0.726739ZM0.786716 18.877L18.6049 1.05887L17.9406 0.394614L0.122464 18.2128L0.786716 18.877Z" fill="currentColor" />
    </svg>
  );
}

export default function NotFound() {
  useEffect(() => {
    document.body.style.overflow = "auto";
  }, []);

  return (
    <main className="not-found">
      <div className="not-found__container">
        <div className="not-found__content">
          <span className="not-found__label text-uppercase">Page not found</span>
          <h1 className="not-found__title">
            The page you&apos;re looking for seems to have wandered off.
          </h1>
          <p className="not-found__desc font-serif">
            Perhaps it found its way to a different shelf, or perhaps it never
            existed at all.
          </p>
          <Link href="/" className="not-found__cta">
            <span>Return home</span>
            <span className="not-found__cta-arrow">
              <ArrowIcon />
            </span>
          </Link>
        </div>
        <div className="not-found__visual">
          <div className="not-found__icon-wrapper">
            <NotFoundIcon />
          </div>
        </div>
      </div>
    </main>
  );
}