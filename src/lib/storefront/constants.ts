import type { StorefrontNavLink, StorefrontNavigation } from "@/lib/storefront/types";

export const ACCENT_COLORS: string[] = ["#F1CCCF", "#D8D0C4", "#D3E5EF", "#E8DFC8"];

export const DEFAULT_NAV_TOP: StorefrontNavLink[] = [
  { label: "All Products", href: "/products" },
  { label: "Bestsellers", href: "/products?sort=bestsellers" },
  { label: "New Arrivals", href: "/products?sort=new" },
];

export const DEFAULT_NAV_CONCERNS: StorefrontNavLink[] = [
  { label: "Brightening", href: "/products?concern=brightening-moisturiser" },
  { label: "Hydration", href: "/products?concern=hydration-serum" },
  { label: "Anti-Ageing", href: "/products?concern=overnight-treatment" },
  { label: "SPF Protection", href: "/products?concern=uv-protection" },
  { label: "Eye Care", href: "/products?concern=eye-treatment" },
  { label: "Targeted Treatment", href: "/products?concern=targeted-treatment" },
];

export const DEFAULT_NAV_BRANDS: StorefrontNavLink[] = [
  { label: "Lumiere Atelier", href: "/products?brand=lumiere-atelier" },
  { label: "Botan Botanics", href: "/products?brand=botan-botanics" },
  { label: "Clinis Lab", href: "/products?brand=clinis-lab" },
  { label: "Velour Skin", href: "/products?brand=velour-skin" },
  { label: "Verdant", href: "/products?brand=verdant" },
  { label: "Eclat London", href: "/products?brand=eclat-london" },
];

export const DEFAULT_NAVIGATION: StorefrontNavigation = {
  top: DEFAULT_NAV_TOP,
  concerns: DEFAULT_NAV_CONCERNS,
  brands: DEFAULT_NAV_BRANDS,
};
