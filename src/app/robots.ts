import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const DISALLOWED_PATHS = [
  "/api/",
  "/cart",
  "/login",
  "/signup",
  "/profile",
  "/order-lookup",
  "/order-confirmed",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
