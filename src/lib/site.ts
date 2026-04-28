export const SITE_URL = "https://www.aestheticslink.com";

export const SITE_NAME = "AestheticsLink";

export const SITE_TITLE = "AestheticsLink - Aesthetic by Design, Linked to Results";

export const SITE_DESCRIPTION =
  "Precision-engineered aesthetic skincare formulas backed by science and designed without compromise.";

export const SITE_OG_IMAGE_ALT =
  "AestheticsLink premium skincare with scientific precision and refined aesthetics.";

export function toAbsoluteUrl(path = "/"): string {
  return new URL(path, SITE_URL).toString();
}
