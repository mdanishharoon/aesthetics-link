import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AestheticsLink",
    short_name: "AestheticsLink",
    description:
      "Precision-engineered aesthetic skincare formulas backed by science and designed without compromise.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe8",
    theme_color: "#0e0c0b",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
