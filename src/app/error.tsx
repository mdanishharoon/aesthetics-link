"use client";

import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "32px",
          background: "#f6f0e8",
          color: "#1b1511",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: 560,
            width: "100%",
            textAlign: "center",
            padding: "48px 32px",
            border: "1px solid rgba(27, 21, 17, 0.12)",
            background: "rgba(255, 255, 255, 0.72)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            Unexpected error
          </p>
          <h1
            style={{
              margin: "16px 0 12px",
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              lineHeight: 1,
            }}
          >
            Something went wrong.
          </h1>
          <p
            style={{
              margin: "0 auto 28px",
              maxWidth: 420,
              lineHeight: 1.6,
              opacity: 0.82,
            }}
          >
            We could not load this page correctly. Please try again, or return in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 0,
              padding: "14px 22px",
              background: "#1b1511",
              color: "#f6f0e8",
              cursor: "pointer",
              fontSize: 14,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
