export function getWooStoreBaseUrl(): string | null {
  const raw = process.env.WOOCOMMERCE_STORE_URL?.trim();

  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isWooStoreConfigured(): boolean {
  return getWooStoreBaseUrl() !== null;
}
