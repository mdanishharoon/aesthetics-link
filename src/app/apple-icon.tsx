import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#140f0c",
          color: "#f3e3d2",
          fontSize: 92,
          fontStyle: "italic",
          fontWeight: 700,
          letterSpacing: "-0.08em",
          borderRadius: 36,
        }}
      >
        A
      </div>
    ),
    size,
  );
}
