import { z } from "zod";

export const ProductBenefitSchema = z.object({
  icon: z.string(),
  title: z.string(),
  desc: z.string(),
});
export type ProductBenefit = z.infer<typeof ProductBenefitSchema>;

export const KeyIngredientSchema = z.object({
  name: z.string(),
  desc: z.string(),
});
export type KeyIngredient = z.infer<typeof KeyIngredientSchema>;

export const PriceSourceSchema = z.enum(["retail", "wholesale"]);
export type PriceSource = z.infer<typeof PriceSourceSchema>;

const ProductImagesSchema = z.object({
  hero: z.string(),
  heroAlt: z.string(),
  detail: z.string(),
  detailAlt: z.string(),
  texture: z.string(),
});

const ProductClaimSchema = z.object({
  headline: z.string(),
  headlineSerif: z.string(),
  sub: z.string(),
});

export const StorefrontBaseProductSchema = z.object({
  wooId: z.number().int().nonnegative().optional(),
  slug: z.string(),
  name: z.string(),
  shortName: z.string(),
  category: z.string(),
  tagline: z.string(),
  description: z.string(),
  price: z.string(),
  retailPrice: z.string().optional(),
  regularPrice: z.string().nullable().optional(),
  priceSource: PriceSourceSchema.optional(),
  hasDiscount: z.boolean().optional(),
  claim: ProductClaimSchema,
  benefits: z.array(ProductBenefitSchema),
  keyIngredients: z.array(KeyIngredientSchema),
  howToUse: z.array(z.string()),
  images: ProductImagesSchema,
  accentBg: z.string(),
});
export type StorefrontBaseProduct = z.infer<typeof StorefrontBaseProductSchema>;

export const StorefrontCatalogProductSchema = z.object({
  id: z.number().int().nonnegative(),
  slug: z.string(),
  name: z.string(),
  shortName: z.string(),
  category: z.string(),
  categorySlug: z.string(),
  categorySlugs: z.array(z.string()),
  brand: z.string().nullable().optional(),
  brandSlug: z.string().nullable().optional(),
  brandSlugs: z.array(z.string()).optional(),
  tagline: z.string(),
  description: z.string(),
  price: z.string(),
  retailPrice: z.string().optional(),
  regularPrice: z.string().nullable().optional(),
  priceSource: PriceSourceSchema.optional(),
  hasDiscount: z.boolean().optional(),
  productType: z.string().optional(),
  hasOptions: z.boolean().optional(),
  inStock: z.boolean().optional(),
  stockStatus: z.string().optional(),
  stockMessage: z.string().nullable().optional(),
  image: z.string(),
  imageAlt: z.string(),
  accentBg: z.string(),
});
export type StorefrontCatalogProduct = z.infer<typeof StorefrontCatalogProductSchema>;

export const StorefrontVariationAttributeOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type StorefrontVariationAttributeOption = z.infer<
  typeof StorefrontVariationAttributeOptionSchema
>;

export const StorefrontVariationAttributeSchema = z.object({
  id: z.string(),
  label: z.string(),
  apiName: z.string(),
  options: z.array(StorefrontVariationAttributeOptionSchema),
});
export type StorefrontVariationAttribute = z.infer<typeof StorefrontVariationAttributeSchema>;

export const StorefrontVariableConfigSchema = z.object({
  isVariable: z.boolean(),
  attributes: z.array(StorefrontVariationAttributeSchema),
  defaults: z.record(z.string(), z.string()),
  variations: z.array(
    z.object({
      id: z.number().int().nonnegative().optional(),
      attributes: z.record(z.string(), z.string()),
      price: z.string().nullable(),
      regularPrice: z.string().nullable(),
      inStock: z.boolean().nullable(),
      stockStatus: z.string().nullable(),
    }),
  ),
});
export type StorefrontVariableConfig = z.infer<typeof StorefrontVariableConfigSchema>;

export const StorefrontDetailProductSchema = StorefrontBaseProductSchema.extend({
  regularPrice: z.string().nullable().optional(),
  priceSource: PriceSourceSchema.optional(),
  hasDiscount: z.boolean().optional(),
  productType: z.string().optional(),
  hasOptions: z.boolean().optional(),
  variableConfig: StorefrontVariableConfigSchema.nullable().optional(),
  inStock: z.boolean().optional(),
  stockStatus: z.string().optional(),
  stockMessage: z.string().nullable().optional(),
});
export type StorefrontDetailProduct = z.infer<typeof StorefrontDetailProductSchema>;

export const StorefrontNavLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  image: z.string().nullable().optional(),
});
export type StorefrontNavLink = z.infer<typeof StorefrontNavLinkSchema>;

export const StorefrontNavigationSchema = z.object({
  top: z.array(StorefrontNavLinkSchema),
  concerns: z.array(StorefrontNavLinkSchema),
  brands: z.array(StorefrontNavLinkSchema),
});
export type StorefrontNavigation = z.infer<typeof StorefrontNavigationSchema>;
