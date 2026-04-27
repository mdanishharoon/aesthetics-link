// Barrel re-export for the typed schema directory. Consumers should import from
// `@/types` rather than reaching into subdirectories so the schema layout can
// be reorganized without touching every call site.

export * from "./woocommerce/customer";
export * from "./woocommerce/cart";
export * from "./woocommerce/product";
export * from "./woocommerce/order";
export * from "./woocommerce/review";
export * from "./woocommerce/coupon";
export * from "./woocommerce/subscription";

export * from "./api/auth";
export * from "./api/responses";
export * from "./api/requests";

export * from "./features/marketing";
export * from "./features/newsletter";
export * from "./features/wishlist";
export * from "./features/search";
