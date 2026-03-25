"use client";

import { useEffect, useRef, useState } from "react";

const LEFT_DIGITS = [0, 2, 6, 9];
const RIGHT_DIGITS = [0, 5, 7, 8, 9];

export default function Preloader() {
  const leftInnerRef = useRef<HTMLDivElement>(null);
  const rightInnerRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);
  const [className, setClassName] = useState("preloader");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => {
        if (t >= 4) {
          clearInterval(id);
          return t;
        }
        return t + 1;
      });
    }, 300);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const leftIdx = Math.min(tick, LEFT_DIGITS.length - 1);
    const rightIdx = Math.min(tick, RIGHT_DIGITS.length - 1);
    const el = leftInnerRef.current;
    if (el) {
      el.style.transform = `translateY(-${(leftIdx * 100) / LEFT_DIGITS.length}%)`;
    }
    const er = rightInnerRef.current;
    if (er) {
      er.style.transform = `translateY(-${(rightIdx * 100) / RIGHT_DIGITS.length}%)`;
    }
  }, [tick]);

  useEffect(() => {
    const t0 = setTimeout(() => {
      setClassName("preloader loading");
    }, 0);
    const t1 = setTimeout(() => {
      setClassName("preloader loading show-logo");
    }, 1500);
    const t2 = setTimeout(() => {
      setClassName("preloader loading show-logo done");
    }, 2500);
    const t3 = setTimeout(() => {
      setHidden(true);
    }, 3500);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div
      className={className}
      style={{ display: hidden ? "none" : undefined }}
    >
      <div className="bg">
        <div className="bg__left" />
        <div className="bg__right" />
      </div>
      <div className="preloader__inner">
        <div className="text">
          <div className="number-wrapper">
            <div className="left">
              <div ref={leftInnerRef} className="left-inner">
                {LEFT_DIGITS.map((d, i) => (
                  <span key={i} className="number">
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div className="right">
              <div ref={rightInnerRef} className="right-inner">
                {RIGHT_DIGITS.map((d, i) => (
                  <span key={i} className="number">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="line" />
        <div className="logo" aria-hidden>
          <div className="logo__left">
            <span className="preloader__word">true.</span>
          </div>
          <div className="logo__right">
            <span className="preloader__word">kind.</span>
          </div>
        </div>
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    </div>
  );
}
