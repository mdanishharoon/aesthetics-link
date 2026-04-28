import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f3e3d2 0%, #e7d0c7 52%, #c8a388 100%)",
          color: "#140f0c",
          fontSize: 240,
          fontStyle: "italic",
          fontWeight: 700,
          letterSpacing: "-0.08em",
        }}
      >
        A
      </div>
    ),
    size,
  );
}
