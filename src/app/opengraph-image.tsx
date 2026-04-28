import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE_ALT } from "@/lib/site";

export const alt = SITE_OG_IMAGE_ALT;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #171210 0%, #2d211c 42%, #d7b59d 100%)",
          color: "#fbf5ee",
          padding: "64px 72px",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "72%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              opacity: 0.84,
            }}
          >
            Clinical skincare
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                display: "flex",
                fontSize: 94,
                lineHeight: 1,
                fontWeight: 700,
                letterSpacing: "-0.05em",
              }}
            >
              {SITE_NAME}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 44,
                lineHeight: 1.2,
                color: "#f0ddce",
                maxWidth: 760,
              }}
            >
              {SITE_DESCRIPTION}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            fontSize: 220,
            lineHeight: 1,
            fontStyle: "italic",
            fontWeight: 700,
            letterSpacing: "-0.08em",
            color: "#f3e3d2",
          }}
        >
          A
        </div>
      </div>
    ),
    size,
  );
}
