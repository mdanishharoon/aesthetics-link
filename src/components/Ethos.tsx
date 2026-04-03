"use client";

import Link from "next/link";

const STATS = [
  { num: "1800+", label: "Blocked Ingredients" },
  { num: "100%", label: "Formula Disclosed" },
  { num: "0", label: "Compromise" },
  { num: "30yr", label: "UK Clinic Heritage" },
] as const;

export default function Ethos() {
  return (
    <section id="ethos" className="reveal-up" data-reveal>
      <div className="container">

        <div className="ethos__stats">
          {STATS.map((s) => (
            <div key={s.num} className="ethos__stat">
              <span className="ethos__stat-num font-serif">{s.num}</span>
              <span className="ethos__stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="ethos__rule" />

        <div className="ethos__bottom">
          <p className="ethos__statement font-serif">
            Every active earns its place.
            <br />
            Every formula is built to last.
          </p>
          <Link href="/philosophy" className="ethos__more">
            <span className="text-uppercase">Read our philosophy</span>
            <svg
              width="13"
              height="8"
              viewBox="0 0 13 8"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12.3536 4.35355C12.5488 4.15829 12.5488 3.84171 12.3536 3.64645L9.17157 0.464466C8.97631 0.269204 8.65973 0.269204 8.46447 0.464466C8.2692 0.659728 8.2692 0.976311 8.46447 1.17157L11.2929 4L8.46447 6.82843C8.2692 7.02369 8.2692 7.34027 8.46447 7.53553C8.65973 7.7308 8.97631 7.7308 9.17157 7.53553L12.3536 4.35355ZM0 4.5H12V3.5H0V4.5Z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
}
